// Spojení se Supabase (projekt „ucebna“) bez knihoven: přihlášení, tabulky, úložiště souborů.
// Veřejný (publishable) klíč sem patří – data chrání pravidla přístupu v databázi.
export const URL_SERVERU = "https://lioqktkvjghckboyvsfj.supabase.co";
const KLIC = "sb_publishable_mc5yK14EDBd-v1jFMzXG5Q_LjGoDhu5";
const KLIC_RELACE = "ucebna-relace";
const DOMENA_JMEN = "@ucebna.invalid"; // přihlášení jménem bez e-mailu: „mariana“ → mariana@ucebna.invalid

export class ChybaServeru extends Error { constructor(zprava, kod) { super(zprava); this.kod = kod; } }

const cti = () => { try { return JSON.parse(localStorage.getItem(KLIC_RELACE)); } catch (e) { return null; } };
const uloz = (r) => { try { if (r) localStorage.setItem(KLIC_RELACE, JSON.stringify(r)); else localStorage.removeItem(KLIC_RELACE); } catch (e) { /* bez úložiště */ } };
const zRelace = (d) => ({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), uzivatel: { id: d.user.id } });

async function dotaz(cesta, volby = {}) {
  let odp;
  try { odp = await fetch(URL_SERVERU + cesta, volby); } catch (e) { throw new ChybaServeru("Nejde se spojit se serverem. Zkontroluj internet.", "sit"); }
  if (odp.status >= 500) throw new ChybaServeru("Server teď neodpovídá. Zkus to za chvíli znovu.", "server");
  return odp;
}

export const relace = () => cti();

export async function prihlasit(jmeno, heslo) {
  const email = jmeno.includes("@") ? jmeno.trim() : jmeno.trim().toLowerCase() + DOMENA_JMEN;
  const odp = await dotaz("/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: KLIC, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: heslo }) });
  const d = await odp.json().catch(() => ({}));
  if (!odp.ok) throw new ChybaServeru(odp.status === 400 ? "Jméno nebo heslo nesedí." : odp.status === 429 ? "Moc pokusů za sebou. Zkus to za minutu." : "Přihlášení se nepovedlo.", "prihlaseni");
  const r = zRelace(d); uloz(r); return r;
}

async function obnovit() {
  const r = cti(); if (!r) return null;
  const odp = await dotaz("/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { apikey: KLIC, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: r.refresh_token }) });
  if (!odp.ok) { uloz(null); return null; }
  const n = zRelace(await odp.json()); uloz(n); return n;
}

async function platnaRelace() {
  let r = cti(); if (!r) throw new ChybaServeru("Nejdřív se přihlas.", "odhlaseno");
  if (r.expires_at - 60 < Date.now() / 1000) r = await obnovit();
  if (!r) throw new ChybaServeru("Přihlášení vypršelo. Přihlas se znovu.", "odhlaseno");
  return r;
}

// dotaz za přihlášeného uživatele; při 401 jednou obnoví přihlášení
export async function api(cesta, volby = {}, znovu = true) {
  const r = await platnaRelace();
  const odp = await dotaz(cesta, { ...volby, headers: { apikey: KLIC, Authorization: "Bearer " + r.access_token, ...(volby.headers || {}) } });
  if (odp.status === 401 && znovu) { if (await obnovit()) return api(cesta, volby, false); uloz(null); throw new ChybaServeru("Přihlášení vypršelo. Přihlas se znovu.", "odhlaseno"); }
  if (!odp.ok && !volby.vratitChybu) { const t = await odp.text().catch(() => ""); throw new ChybaServeru("Server odmítl požadavek.", "odmitnuto " + odp.status + " " + t.slice(0, 120)); }
  return odp;
}

export const tabulka = async (dotazText) => (await api("/rest/v1/" + dotazText, { headers: { Accept: "application/json" } })).json();
export const zapsat = async (tab, radek, konflikt) => (await api(`/rest/v1/${tab}${konflikt ? "?on_conflict=" + konflikt : ""}`, {
  method: "POST", headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(radek) })).json();
export const funkce = (nazev, parametry) => api("/rest/v1/rpc/" + nazev, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parametry) }).catch(() => null);

// soubor ze soukromého repozitáře přes funkci na serveru (vždy nejnovější verze)
export const souborZRepa = async (cesta) => (await api("/functions/v1/soubor?cesta=" + encodeURIComponent(cesta))).text();
export const souborText = async (cesta) => (await api("/storage/v1/object/authenticated/aplikace/" + cesta)).text();
export const nahratSoubor = (cesta, soubor) => api("/storage/v1/object/aplikace/" + cesta, { method: "POST", headers: { "Content-Type": soubor.type || "text/html", "x-upsert": "true" }, body: soubor });
export const seznamSouboru = async (slozka) => (await api("/storage/v1/object/list/aplikace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefix: slozka, limit: 100 }) })).json();

// správa účtů (jen správce): seznam přihlašovacích jmen, založení žáka, nové heslo – heslo jde jen na server přihlašování
export async function spravaUctu(akce, data = {}) {
  const odp = await api("/functions/v1/ucet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ akce, ...data }), vratitChybu: true });
  const d = await odp.json().catch(() => ({}));
  if (!odp.ok) throw new ChybaServeru(d.chyba || "Server odmítl požadavek.", "ucet " + odp.status);
  return d;
}

export async function odhlasit() {
  const r = cti(); uloz(null);
  if (r) await dotaz("/auth/v1/logout", { method: "POST", headers: { apikey: KLIC, Authorization: "Bearer " + r.access_token } }).catch(() => null);
}
