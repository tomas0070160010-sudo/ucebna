// Soubor aplikace pro přihlášeného uživatele: čte se ze soukromého repozitáře ucebna-soubory (klíč jen pro čtení v GITHUB_TOKEN).
// Přístup ověřuje databáze pravidly (RLS) s tokenem uživatele – kdo nemá přístup k aplikaci, nedostane nic.
// Nasazeno jako Edge Function „soubor“ (verify_jwt vypnuté, přihlášení ověřuje funkce sama). Klíče jen v prostředí serveru.
const REPO = "tomas0070160010-sudo/ucebna-soubory";
const POVOLENE = ["https://tomas0070160010-sudo.github.io", "http://localhost:8790"];
const SUPA = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const TOKEN = Deno.env.get("GITHUB_TOKEN") ?? "";

const cors = (req: Request) => {
  const o = req.headers.get("Origin") ?? "";
  return { "Access-Control-Allow-Origin": POVOLENE.includes(o) ? o : POVOLENE[0], "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "GET, OPTIONS", "Vary": "Origin" };
};
const json = (o: unknown, status: number, h: Record<string, string>) => new Response(JSON.stringify(o), { status, headers: { ...h, "Content-Type": "application/json; charset=utf-8" } });
const github = (cesta: string) => fetch(`https://api.github.com/repos/${REPO}/contents/${cesta}`, {
  headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ucebna" },
});

Deno.serve(async (req: Request) => {
  const h = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const url = new URL(req.url);

  // kontrola nastavení bez obsahu: je klíč a je vidět soubor s verzí?
  if (url.searchParams.get("stav") === "1") {
    if (!TOKEN) return json({ github: "chybí GITHUB_TOKEN" }, 200, h);
    const r = await github("matika/VERZE");
    return json({ github: r.status, verze: r.ok ? (await r.text()).trim() : null }, 200, h);
  }

  const cesta = url.searchParams.get("cesta") ?? "";
  const m = /^([a-z0-9-]+)\/([a-z0-9-]+\.html|VERZE)$/.exec(cesta);
  if (!m) return json({ chyba: "neplatná cesta" }, 400, h);
  const [, app, soubor] = m;
  if (soubor === "lektor.html") return json({ chyba: "neplatná cesta" }, 400, h);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ chyba: "nepřihlášen" }, 401, h);
  const apikey = req.headers.get("apikey") || ANON;
  const p = await fetch(`${SUPA}/rest/v1/aplikace?select=id&id=eq.${app}`, { headers: { apikey, Authorization: auth } });
  if (p.status === 401) return json({ chyba: "nepřihlášen" }, 401, h);
  const radky = p.ok ? await p.json() : [];
  if (!Array.isArray(radky) || !radky.length) return json({ chyba: "bez přístupu" }, 403, h);

  if (!TOKEN) return json({ chyba: "server nemá GITHUB_TOKEN" }, 500, h);
  const g = await github(cesta);
  if (!g.ok) return json({ chyba: "soubor nenalezen", github: g.status }, g.status === 404 ? 404 : 502, h);
  return new Response(g.body, { headers: { ...h, "Content-Type": soubor.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain; charset=utf-8", "Cache-Control": "private, max-age=60" } });
});
