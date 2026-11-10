// Učebna: přihlášení, dlaždice aplikací, spuštění aplikace se synchronizací, náhled za žáka (Hodina spolu / Vyzkoušet) a Správa souborů.
import { relace, prihlasit, odhlasit, tabulka, funkce, souborText, souborZRepa, nahratSoubor, seznamSouboru } from "./server.js";
import { stahnout, nahrat, serverNovejsi, smazMistni, mistni, odlozMistni, vratMistni, nastavMistni } from "./sync.js";
import { nactiZaky } from "./zaci.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cas = (d) => new Date(d).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
const hodiny = () => new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
// aplikace, které Učebna umí spustit: kde leží soubor a jaké klíče se synchronizují
// hry žijí v Matice (záložka ⭐): dlaždice Hry otevře Matiku rovnou u her
const APLIKACE = { matika: { predpona: "matika-", znak: "∑", popis: "Lekce po krocích, testy a hry na oddech" }, hry: { znak: "⚓", v: "matika", hash: "#hry", popis: "Lodě, piškvorky, pexeso… Online s kamarádem přes kód" } };
const brzy = (id) => { const z = APLIKACE[id]; return !!z.brzy || (!!z.v && !ja.pristupy[z.v]); };
let ja = null, bezi = null;

const ukaz = (id) => ["prihlaseni", "domu", "aplikace"].forEach((x) => { $("#obr-" + x).hidden = x !== id; });

async function nactiMe() {
  const uid = relace().uzivatel.id;
  const [[profil], pristupy, aplikace] = await Promise.all([tabulka(`profily?select=jmeno,role&id=eq.${uid}`), tabulka(`pristupy?select=aplikace,role&uzivatel=eq.${uid}`), tabulka("aplikace?select=id,nazev,popis&order=id")]);
  ja = { id: uid, jmeno: profil ? profil.jmeno : "", spravce: !!profil && profil.role === "spravce", pristupy: Object.fromEntries(pristupy.map((p) => [p.aplikace, p.role])), aplikace };
}

function domu() {
  ukaz("domu");
  $("#kdo").textContent = ja.jmeno; $("#pozdrav").textContent = `Ahoj, ${ja.jmeno || "vítej"}`;
  const appky = ja.aplikace.filter((a) => APLIKACE[a.id]).sort((a, b) => brzy(a.id) - brzy(b.id));
  $("#dlazdice").innerHTML = appky.length ? appky.map((a) => { const z = APLIKACE[a.id], b = brzy(a.id);
    return `<button type="button" class="dlazdice" data-app="${esc(a.id)}" ${b ? "disabled" : ""}><span class="znak" aria-hidden="true">${z.znak}</span><b>${esc(a.nazev)}</b><small>${b ? "Připravujeme" : esc(z.popis)}</small></button>`; }).join("")
    : `<p class="pozn">Zatím nemáš přístup k žádné aplikaci. Napiš lektorovi.</p>`;
  $("#sprava").hidden = !ja.spravce; if (ja.spravce) nactiSoubory();
  const lektor = ja.spravce || Object.values(ja.pristupy).includes("lektor"); $("#zaci").hidden = !lektor; if (lektor) nactiZaky(ja);
  if (appky.some((a) => a.id === "matika")) souborZRepa("matika/VERZE").then((v) => { const s = $('[data-app="matika"] small'); if (s && v) s.textContent = `${APLIKACE.matika.popis} · verze ${v.trim()}`; }).catch(() => null);
}

async function start() {
  vratMistni(); // stránka se zavřela uprostřed náhledu za žáka → vlastní data zpět
  if (!relace()) return ukaz("prihlaseni");
  try { await nactiMe(); domu(); } catch (e) { if (e.kod === "odhlaseno") return ukaz("prihlaseni"); ukaz("prihlaseni"); hlaseni(e.message); }
}
const hlaseni = (t) => { const c = $("#chyba"); c.textContent = t; c.hidden = !t; };

$("#form-prihlaseni").addEventListener("submit", async (e) => { e.preventDefault(); const f = e.target, b = $("button", f);
  hlaseni(""); b.disabled = true; b.textContent = "Přihlašuji…";
  try { await prihlasit(f.jmeno.value, f.heslo.value); await nactiMe(); funkce("zapis_aktivitu", { app: null, co: "prihlaseni" }); f.heslo.value = ""; domu(); }
  catch (x) { hlaseni(x.message || "Přihlášení se nepovedlo."); }
  finally { b.disabled = false; b.textContent = "Přihlásit se"; } });

// ---------- spuštění aplikace ----------
const stavSync = (t, typ = "") => { const s = $("#stav-sync"); s.textContent = t; s.className = "stav-sync " + typ; };
async function ulozit() { if (!bezi || bezi.nahled) return; const { app, predpona } = bezi;
  try { if (await nahrat(app, predpona, ja.id)) stavSync(`Uloženo ${hodiny()}`, "ok"); } catch (e) { stavSync("Neuloženo – zkusím to znovu", "ne"); } }

// jeden soubor aplikace pro všechny: nejdřív nejnovější verze ze soukromého repozitáře, ručně nahraný soubor je záloha
async function souborAplikace(app, lektor) {
  let html = null; try { html = await souborZRepa(`${app}/matika.html`); } catch (e) { if (e.kod === "sit" || e.kod === "odhlaseno") throw e; }
  if (!html) for (const soubor of lektor ? ["matika.html", "lektor.html", "zak.html"] : ["matika.html", "zak.html"]) { try { html = await souborText(`${app}/${soubor}`); break; } catch (e) { if (e.kod === "sit" || e.kod === "odhlaseno") throw e; } }
  if (!html) return null;
  // soubor z artefaktu nemá kostru stránky – bez <!doctype> by se kreslil ve starém režimu prohlížeče
  return /^\s*<!doctype/i.test(html) ? html : `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`;
}
const vlozPred = (html, kus) => { const i = html.search(/<script id="matika-js">/); return i >= 0 ? html.slice(0, i) + kus + html.slice(i) : html.replace(/<\/body>/i, () => kus + "</body>"); };
function zobraz(html, hash, bezi2) {
  if (bezi && bezi.url) URL.revokeObjectURL(bezi.url);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  bezi = { ...bezi2, url };
  const r = $("#ramec"); r.src = url + (hash || ""); r.hidden = false; r.title = bezi2.nazev || "Aplikace";
}

async function spustit(id) {
  const zd = APLIKACE[id], app = zd.v || id, z = APLIKACE[app]; ukaz("aplikace"); stavSync("Načítám…"); $("#ramec").hidden = true; $("#obr-aplikace").classList.remove("nahled"); $('[data-a="zpet"]').textContent = "← Učebna";
  try {
    await stahnout(app, z.predpona, ja.id);
    const lektor = ja.spravce || ja.pristupy[app] === "lektor";
    let html = await souborAplikace(app, lektor);
    if (!html) { stavSync(lektor ? "Matika tu ještě není – nahraj ji ve Správě." : "Matika tu ještě není. Lektor ji brzy přidá.", "ne"); return; }
    if (!lektor) html = await zakovska(app, html, ja.id);
    if (zd.hash === "#hry") html = vlozPred(html, `<script>window.__HRY = true;<\/script>\n`); // z dlaždice Hry: hry se ukážou hned
    zobraz(html, zd.hash, { app, predpona: z.predpona, nazev: $(`[data-app="${id}"] b`)?.textContent });
    stavSync("Postup se ukládá sám");
    funkce("zapis_aktivitu", { app, co: "otevreni" });
    bezi.casovac = setInterval(ulozit, 20000);
  } catch (e) { if (e.kod === "odhlaseno") { zastavit(); ukaz("prihlaseni"); hlaseni(e.message); } else stavSync(e.message, "ne"); }
}

// náhled za žáka: Hodina spolu (vše otevřené, testy, nejdřív nové úlohy) nebo Vyzkoušet (přesně jeho verze).
// Jeho postup se jen zkopíruje sem – nic se mu neuloží; vlastní data lektora jsou mezitím stranou.
async function nahled({ uid, jmeno, rezim }) {
  const app = "matika", z = APLIKACE[app]; ukaz("aplikace"); stavSync("Připravuji…"); $("#ramec").hidden = true;
  try {
    let html = await souborAplikace(app, true);
    if (!html) { stavSync("Matika tu ještě není.", "ne"); return; }
    const [st] = await tabulka(`stav?select=data&uzivatel=eq.${uid}&aplikace=eq.${app}`);
    if (bezi && !bezi.nahled) { await ulozit(); zastavit(); }
    await nahrat(app, z.predpona, ja.id).catch(() => null); // vlastní postup nejdřív na server
    odlozMistni(z.predpona);
    nastavMistni(z.predpona, { ...((st && st.data) || {}), "matika-uvod-30": "true", ...(rezim === "hodina" ? { "matika-odemknout-vse": "true" } : {}) });
    html = rezim === "hodina" ? vlozPred(html, `<script>window.__HODINA = true;<\/script>\n`) : await zakovska(app, html, uid);
    zobraz(html, "", { app, predpona: z.predpona, nahled: true, nazev: `Matika – ${jmeno}` });
    $("#obr-aplikace").classList.add("nahled"); $('[data-a="zpet"]').textContent = rezim === "hodina" ? "← Konec hodiny" : "← Konec zkoušky";
    stavSync(`${rezim === "hodina" ? "Hodina spolu" : "Zkouška"} · ${jmeno} – nic se neuloží`, "nahled");
  } catch (e) { await konecNahledu(); if (e.kod === "odhlaseno") { ukaz("prihlaseni"); hlaseni(e.message); } else stavSync(e.message, "ne"); }
}
async function konecNahledu() { const r = $("#ramec");
  // nejdřív starou stránku úplně zavřít (může ještě ukládat při odchodu), pak vrátit vlastní data
  await new Promise((ok) => { const t = setTimeout(ok, 1500); r.addEventListener("load", () => { clearTimeout(t); ok(); }, { once: true }); r.src = "about:blank"; });
  if (bezi && bezi.url) URL.revokeObjectURL(bezi.url); bezi = null; $("#obr-aplikace").classList.remove("nahled");
  nastavMistni(APLIKACE.matika.predpona, {}); vratMistni(); }
document.addEventListener("ucebna-nahled", (e) => nahled(e.detail));

// žákovská verze: do souboru se vloží nastavení od lektora (lekce, odemykání, body) – stejně jako soubor ze Sdílet
async function zakovska(app, html, uid) {
  if (new DOMParser().parseFromString(html, "text/html").getElementById("zak-data")) return html; // už je to soubor pro žáka
  const [n] = await tabulka(`nastaveni?select=data&aplikace=eq.${app}&uzivatel=eq.${uid}`);
  const zak = (n && n.data && n.data.zak) || { vytvoreno: new Date().toISOString().slice(0, 10), lekce: ["zlomky", "uhly", "vyrazy", "rovnice", "geometrie", "telesa", "konstrukce", "grafy", "procenta", "rady", "cas", "slovni"],
    odemceni: { lekce: {}, kroky: {} }, nastaveni: { postupne: true, klic: "po", casomira: true }, testy: [] };
  return vlozPred(html, `<script type="application/json" id="zak-data">${JSON.stringify(zak).replace(/</g, "\\u003c")}<\/script>\n`);
}
function zastavit() { if (!bezi) return; clearInterval(bezi.casovac); if (bezi.url) URL.revokeObjectURL(bezi.url); $("#ramec").src = "about:blank"; bezi = null; }

document.addEventListener("visibilitychange", async () => { if (!bezi || bezi.nahled) return;
  if (document.visibilityState === "hidden") { ulozit(); return; }
  try { // vrací se k aplikaci: mezitím mohlo ukládat jiné zařízení
    const { app, predpona } = bezi;
    if (await serverNovejsi(app, ja.id)) { await nahrat(app, predpona, ja.id).catch(() => null); if (await serverNovejsi(app, ja.id)) { await stahnout(app, predpona, ja.id); $("#ramec").contentWindow.location.reload(); stavSync("Načteno z jiného zařízení", "ok"); } }
  } catch (e) { /* bez spojení – pokračuje se s daty tady */ } });
window.addEventListener("pagehide", () => { ulozit(); });

document.addEventListener("click", async (e) => { const b = e.target.closest("[data-app], [data-a]"); if (!b) return;
  if (b.dataset.app) { spustit(b.dataset.app); return; }
  if (b.dataset.a === "zpet") { if (bezi && bezi.nahled) { await konecNahledu(); domu(); return; } stavSync("Ukládám…"); await ulozit(); zastavit(); domu(); }
  if (b.dataset.a === "odhlasit") { if (bezi && bezi.nahled) await konecNahledu(); await ulozit(); zastavit(); Object.entries(APLIKACE).forEach(([app, z]) => { if (z.predpona) smazMistni(app, z.predpona); }); await odhlasit(); ja = null; ukaz("prihlaseni"); } });

// ---------- Správa: soubory aplikací (jen správce) ----------
const SOUBORY = [["matika", "matika", "Matika po krocích", "soubor matika-po-krocich-v….html z OneDrivu – žákyně dostane svou verzi sama"]];
async function nactiSoubory() {
  let seznam = []; try { seznam = await seznamSouboru("matika/"); } catch (e) { /* ukáže se jako nenahráno */ }
  $("#soubory").innerHTML = SOUBORY.map(([app, kdo, nazev, kde]) => { const f = seznam.find((x) => x.name === `${kdo}.html`);
    return `<div class="soubor"><div><b>${nazev} – ruční záloha</b><small>Nové verze přicházejí samy. Ruční soubor se použije, jen když server verzi z repozitáře nenačte. ${f ? `Záloha nahrána ${cas(f.updated_at || f.created_at)}.` : "Záloha zatím není."} (${kde})</small></div>
      <label class="tl">Nahrát…<input type="file" accept=".html,text/html" data-nahrat="${app}/${kdo}" hidden></label></div>`; }).join("");
}
document.addEventListener("change", async (e) => { const i = e.target.closest("[data-nahrat]"); if (!i || !i.files[0]) return;
  const [app, kdo] = i.dataset.nahrat.split("/"), soubor = i.files[0], st = $("#sprava-stav"); i.value = "";
  const text = await soubor.text(), jeZak = !!new DOMParser().parseFromString(text, "text/html").getElementById("zak-data");
  if (jeZak) { st.textContent = "Tohle je soubor pro žákyni ze Sdílet. Nahraj celou Matiku – soubor matika-po-krocich-v….html z OneDrivu."; return; }
  if (!/<script id="matika-js">/.test(text)) { st.textContent = "Tohle nevypadá jako soubor Matiky. Vyber matika-po-krocich-v….html."; return; }
  st.textContent = "Nahrávám…";
  try { await nahratSoubor(`${app}/${kdo}.html`, new Blob([text], { type: "text/html" })); st.textContent = `Nahráno ${hodiny()}.`; nactiSoubory(); }
  catch (x) { st.textContent = "Nahrání se nepovedlo: " + x.message; } });

window.__ucebna = { mistni }; // pro testy
start();
