// Správa účtů pro správce Učebny: seznam přihlašovacích jmen, založení žáka, nové heslo.
// Heslo zadává správce ve své stránce, funkce ho jen předá serveru přihlašování – nikde se neukládá ani nevypisuje.
// Nasazení: Edge Function „ucet“, verify_jwt vypnuté (kdo volá, ověřuje funkce sama: musí být přihlášený správce).
const SUPA = Deno.env.get("SUPABASE_URL") ?? "";
// klíč správce: starý (SUPABASE_SERVICE_ROLE_KEY), nebo nový (SUPABASE_SECRET_KEYS = {"default": "sb_secret_…"})
const tajny = () => { try { const k = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); return k.default ?? Object.values(k)[0] ?? ""; } catch (_) { return ""; } };
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || tajny();
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const POVOLENE = ["https://tomas0070160010-sudo.github.io", "http://localhost:8790"];
const DOMENA = "@ucebna.invalid";
const VYCHOZI_ZAK = { vytvoreno: "", lekce: ["zlomky", "uhly", "vyrazy", "rovnice", "geometrie", "telesa", "konstrukce", "grafy", "procenta", "rady", "cas", "slovni"],
  odemceni: { lekce: {}, kroky: {} }, cilDne: 50, nastaveni: { postupne: true, klic: "po", casomira: true }, testy: [] };

const cors = (req: Request) => {
  const o = req.headers.get("Origin") ?? "";
  return { "Access-Control-Allow-Origin": POVOLENE.includes(o) ? o : POVOLENE[0], "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
};
const json = (o: unknown, status: number, h: Record<string, string>) => new Response(JSON.stringify(o), { status, headers: { ...h, "Content-Type": "application/json; charset=utf-8" } });
const admin = (cesta: string, volby: RequestInit = {}) => fetch(SUPA + cesta, { ...volby, headers: { apikey: SERVICE, ...(SERVICE.startsWith("sb_") ? {} : { Authorization: `Bearer ${SERVICE}` }), "Content-Type": "application/json", ...(volby.headers ?? {}) } });
const hesloOk = (h: unknown) => typeof h === "string" && h.length >= 8 && h.length <= 72;
const prihlaseni = (email: string) => (email.endsWith(DOMENA) ? email.slice(0, -DOMENA.length) : email);

Deno.serve(async (req: Request) => {
  const h = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  // kontrola nastavení bez dat: je klíč správce a server přihlašování ho přijme?
  if (req.method === "GET" && new URL(req.url).searchParams.get("stav") === "1") {
    if (!SERVICE) return json({ klic: false }, 200, h);
    const r = await admin("/auth/v1/admin/users?page=1&per_page=1");
    return json({ klic: true, prihlasovani: r.status }, 200, h);
  }
  if (req.method !== "POST") return json({ chyba: "jen POST" }, 405, h);

  // kdo volá: přihlášený a správce
  const u = await fetch(SUPA + "/auth/v1/user", { headers: { apikey: req.headers.get("apikey") || ANON, Authorization: req.headers.get("Authorization") ?? "" } });
  if (!u.ok) return json({ chyba: "Nejdřív se přihlas." }, 401, h);
  const ja = await u.json();
  const [prof] = await (await admin(`/rest/v1/profily?select=role,zablokovan&id=eq.${ja.id}`)).json();
  if (!prof || prof.role !== "spravce" || prof.zablokovan) return json({ chyba: "Tohle smí jen správce." }, 403, h);

  const b = await req.json().catch(() => ({}));

  if (b.akce === "seznam") {
    const r = await admin("/auth/v1/admin/users?page=1&per_page=200");
    const d = await r.json();
    return json((d.users ?? []).map((x: { id: string; email?: string; last_sign_in_at?: string }) => ({ id: x.id, prihlaseni: prihlaseni(x.email ?? ""), posledni: x.last_sign_in_at ?? null })), 200, h);
  }

  if (b.akce === "zalozit") {
    const jmeno = String(b.jmeno ?? "").trim(), login = String(b.prihlaseni ?? "").trim().toLowerCase();
    if (!jmeno || jmeno.length > 40) return json({ chyba: "Napiš jméno (nejvýš 40 znaků)." }, 400, h);
    if (!/^[a-z0-9._-]{3,30}$/.test(login) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(login)) return json({ chyba: "Přihlašovací jméno: 3–30 znaků, malá písmena bez háčků, číslice, tečka nebo pomlčka." }, 400, h);
    if (!hesloOk(b.heslo)) return json({ chyba: "Heslo musí mít aspoň 8 znaků." }, 400, h);
    const email = login.includes("@") ? login : login + DOMENA;
    const r = await admin("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password: b.heslo, email_confirm: true, user_metadata: { jmeno } }) });
    if (!r.ok) return json({ chyba: r.status === 422 ? "Tohle přihlašovací jméno už někdo má." : "Účet se nepodařilo založit." }, 400, h);
    const novy = await r.json();
    const appky = (Array.isArray(b.aplikace) ? b.aplikace : []).filter((a: { id: string; role: string }) => ["matika", "hry"].includes(a.id) && ["zak", "lektor", "host"].includes(a.role));
    if (appky.length) await admin("/rest/v1/pristupy", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(appky.map((a: { id: string; role: string }) => ({ uzivatel: novy.id, aplikace: a.id, role: a.role }))) });
    if (appky.some((a: { id: string; role: string }) => a.id === "matika" && a.role === "zak"))
      await admin("/rest/v1/nastaveni", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ aplikace: "matika", uzivatel: novy.id, upravil: ja.id, data: { zak: { ...VYCHOZI_ZAK, vytvoreno: new Date().toISOString().slice(0, 10) } } }) });
    return json({ id: novy.id }, 200, h);
  }

  if (b.akce === "heslo") {
    if (!/^[0-9a-f-]{36}$/.test(String(b.uid ?? ""))) return json({ chyba: "Neznámý účet." }, 400, h);
    if (!hesloOk(b.heslo)) return json({ chyba: "Heslo musí mít aspoň 8 znaků." }, 400, h);
    const r = await admin(`/auth/v1/admin/users/${b.uid}`, { method: "PUT", body: JSON.stringify({ password: b.heslo }) });
    return r.ok ? json({ ok: true }, 200, h) : json({ chyba: "Heslo se nepodařilo změnit." }, 400, h);
  }

  return json({ chyba: "Neznámá akce." }, 400, h);
});
