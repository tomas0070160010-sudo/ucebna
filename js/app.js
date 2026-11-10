// Učebna: přihlášení, dlaždice aplikací, spuštění aplikace se synchronizací a Správa souborů.
import { relace, prihlasit, odhlasit, tabulka, funkce, souborText, souborZRepa, nahratSoubor, seznamSouboru } from "./server.js";
import { stahnout, nahrat, serverNovejsi, smazMistni, mistni } from "./sync.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cas = (d) => new Date(d).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
const hodiny = () => new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
// aplikace, které Učebna umí spustit: kde leží soubor a jaké klíče se synchronizují
const APLIKACE = { matika: { predpona: "matika-", znak: "∑", popis: "Lekce po krocích, testy a hry na pauzu" }, hry: { znak: "⚓", brzy: true, popis: "Lodě, Člověče a piškvorky – i s kamarádem přes QR kód" } };
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
  const appky = ja.aplikace.filter((a) => APLIKACE[a.id]).sort((a, b) => !!APLIKACE[a.id].brzy - !!APLIKACE[b.id].brzy);
  $("#dlazdice").innerHTML = appky.length ? appky.map((a) => { const z = APLIKACE[a.id];
    return `<button type="button" class="dlazdice" data-app="${esc(a.id)}" ${z.brzy ? "disabled" : ""}><span class="znak" aria-hidden="true">${z.znak}</span><b>${esc(a.nazev)}</b><small>${z.brzy ? "Připravujeme" : esc(z.popis)}</small></button>`; }).join("")
    : `<p class="pozn">Zatím nemáš přístup k žádné aplikaci. Napiš lektorovi.</p>`;
  $("#sprava").hidden = !ja.spravce; if (ja.spravce) nactiSoubory();
  if (appky.some((a) => a.id === "matika")) souborZRepa("matika/VERZE").then((v) => { const s = $('[data-app="matika"] small'); if (s && v) s.textContent = `${APLIKACE.matika.popis} · verze ${v.trim()}`; }).catch(() => null);
}

async function start() {
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
async function ulozit() { if (!bezi) return; const { app, predpona } = bezi;
  try { if (await nahrat(app, predpona, ja.id)) stavSync(`Uloženo ${hodiny()}`, "ok"); } catch (e) { stavSync("Neuloženo – zkusím to znovu", "ne"); } }

async function spustit(app) {
  const z = APLIKACE[app]; ukaz("aplikace"); stavSync("Načítám…"); $("#ramec").hidden = true;
  try {
    await stahnout(app, z.predpona, ja.id);
    const lektor = ja.spravce || ja.pristupy[app] === "lektor";
    // jeden soubor aplikace pro všechny: nejdřív nejnovější verze ze soukromého repozitáře, ručně nahraný soubor je záloha
    let html = null; try { html = await souborZRepa(`${app}/matika.html`); } catch (e) { if (e.kod === "sit" || e.kod === "odhlaseno") throw e; }
    if (!html) for (const soubor of lektor ? ["matika.html", "lektor.html", "zak.html"] : ["matika.html", "zak.html"]) { try { html = await souborText(`${app}/${soubor}`); break; } catch (e) { if (e.kod === "sit" || e.kod === "odhlaseno") throw e; } }
    if (!html) { stavSync(lektor ? "Matika tu ještě není – nahraj ji ve Správě." : "Matika tu ještě není. Lektor ji brzy přidá.", "ne"); return; }
    // soubor z artefaktu nemá kostru stránky – bez <!doctype> by se kreslil ve starém režimu prohlížeče
    if (!/^\s*<!doctype/i.test(html)) html = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`;
    if (!lektor) html = await zakovska(app, html);
    if (bezi && bezi.url) URL.revokeObjectURL(bezi.url);
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    bezi = { app, predpona: z.predpona, url, minuty: 0 };
    const r = $("#ramec"); r.src = url; r.hidden = false; r.title = $(`[data-app="${app}"] b`)?.textContent || "Aplikace";
    stavSync("Postup se ukládá sám");
    funkce("zapis_aktivitu", { app, co: "otevreni" });
    bezi.casovac = setInterval(ulozit, 20000);
    bezi.uceniCas = setInterval(() => { if (document.visibilityState !== "visible") return; bezi.minuty++; if (bezi.minuty % 5 === 0) funkce("zapis_aktivitu", { app, co: "uceni", min: 5 }); }, 60000);
  } catch (e) { if (e.kod === "odhlaseno") { zastavit(); ukaz("prihlaseni"); hlaseni(e.message); } else stavSync(e.message, "ne"); }
}
// žákovská verze: do souboru se vloží nastavení od lektora (lekce, odemykání, cíl dne) – stejně jako soubor ze Sdílet
async function zakovska(app, html) {
  if (new DOMParser().parseFromString(html, "text/html").getElementById("zak-data")) return html; // už je to soubor pro žáka
  const [n] = await tabulka(`nastaveni?select=data&aplikace=eq.${app}&uzivatel=eq.${ja.id}`);
  const zak = (n && n.data && n.data.zak) || { vytvoreno: new Date().toISOString().slice(0, 10), lekce: ["zlomky", "uhly", "vyrazy", "rovnice", "geometrie", "telesa", "konstrukce", "grafy", "procenta", "rady", "cas", "slovni"],
    odemceni: { lekce: {}, kroky: {} }, cilDne: 50, nastaveni: { postupne: true, klic: "po", casomira: true }, testy: [] };
  const vlozit = `<script type="application/json" id="zak-data">${JSON.stringify(zak).replace(/</g, "\\u003c")}<\/script>\n`;
  const i = html.search(/<script id="matika-js">/);
  return i >= 0 ? html.slice(0, i) + vlozit + html.slice(i) : html.replace(/<\/body>/i, vlozit + "</body>");
}
function zastavit() { if (!bezi) return; clearInterval(bezi.casovac); clearInterval(bezi.uceniCas); if (bezi.url) URL.revokeObjectURL(bezi.url); $("#ramec").src = "about:blank"; bezi = null; }

document.addEventListener("visibilitychange", async () => { if (!bezi) return;
  if (document.visibilityState === "hidden") { ulozit(); return; }
  try { // vrací se k aplikaci: mezitím mohlo ukládat jiné zařízení
    const { app, predpona } = bezi;
    if (await serverNovejsi(app, ja.id)) { await nahrat(app, predpona, ja.id).catch(() => null); if (await serverNovejsi(app, ja.id)) { await stahnout(app, predpona, ja.id); $("#ramec").contentWindow.location.reload(); stavSync("Načteno z jiného zařízení", "ok"); } }
  } catch (e) { /* bez spojení – pokračuje se s daty tady */ } });
window.addEventListener("pagehide", () => { ulozit(); });

document.addEventListener("click", async (e) => { const b = e.target.closest("[data-app], [data-a]"); if (!b) return;
  if (b.dataset.app) { spustit(b.dataset.app); return; }
  if (b.dataset.a === "zpet") { stavSync("Ukládám…"); await ulozit(); zastavit(); domu(); }
  if (b.dataset.a === "odhlasit") { await ulozit(); zastavit(); Object.entries(APLIKACE).forEach(([app, z]) => { if (z.predpona) smazMistni(app, z.predpona); }); await odhlasit(); ja = null; ukaz("prihlaseni"); } });

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
