// Žáci (pro lektora a správce): přístupy, naposledy, postup v Matice, Hodina spolu a náhled žáka, lekce a odemykání, body, nový žák, nové heslo.
// Bez měření času učení – jen to, co žák udělal.
import { api, tabulka, zapsat, spravaUctu } from "./server.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const LEKCE = [["zlomky", "Zlomky"], ["uhly", "Úhly"], ["vyrazy", "Výrazy"], ["rovnice", "Rovnice"], ["geometrie", "Obvody a obsahy"], ["telesa", "Tělesa"], ["konstrukce", "Konstrukce"],
  ["grafy", "Grafy a tabulky"], ["procenta", "Procenta a poměr"], ["rady", "Řady obrazců"], ["cas", "Čas a rychlost"], ["slovni", "Slovní úlohy"]];
const NAZEV = Object.fromEntries(LEKCE);
const TEMATA = { ...NAZEV, cas: "Čas a jednotky" };
const ROLE = { zak: "žák", lektor: "lektor", host: "host" }, APP = { matika: "Matika", hry: "Hry" };
// odměny za ⭐ v Matice (c6-odmeny.js) – lektor je může dát dřív, než na ně žák nasbírá hvězdičky
const ODMENY = [["masle", "Mašle", 150], ["snih", "Pixelový sníh", 200], ["konfety", "Konfety po hotové lekci", 250], ["ksiltovka", "Kšiltovka", 300], ["bubliny", "Bubliny", 400], ["bryle", "Brýle", 450], ["neon", "Kostky Neon", 500], ["noc", "Padající hvězdy", 600], ["sala", "Šála", 600],
  ["drevo", "Kostky Dřevo", 700], ["rakety", "Rakety", 800], ["sluchatka", "Sluchátka", 800], ["ohnostroj-cil", "Ohňostroj za cíl dne", 900], ["akvarium", "Akvárium", 1000], ["klobouk", "Kouzelnický klobouk", 1100], ["vesmir", "Kostky Vesmír", 1200], ["ohnostroj", "Ohňostroj", 1250], ["zare", "Polární záře", 1500], ["plast", "Plášť superhrdiny", 1500]];
const VYCHOZI_ZAK = () => ({ vytvoreno: new Date().toISOString().slice(0, 10), lekce: LEKCE.map(([k]) => k), odemceni: { lekce: {}, kroky: {} }, nastaveni: { postupne: true, klic: "po", casomira: true }, testy: [] });
const kdy = (t) => { if (!t) return "zatím nikdy"; const d = new Date(t), dnes = new Date(), vcera = new Date(Date.now() - 864e5), h = d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === dnes.toDateString() ? `dnes ${h}` : d.toDateString() === vcera.toDateString() ? `včera ${h}` : d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }) + " " + h; };
const cti = (data, k, z) => { try { const v = data && data["matika-" + k]; return v == null ? z : JSON.parse(v); } catch (e) { return z; } };
// úroveň tématu 1–5 – stejná pravidla jako v Matice (Úrovně témat)
function uroven(z) { if (!z || !z.ok) return 0; const dny = z.dny || []; let u = 1; const roz = dny.length < 2 ? 0 : (new Date(dny[dny.length - 1]) - new Date(dny[0])) / 864e5;
  if (z.ok >= 3 && dny.length >= 2) u = 2; if (u >= 2 && z.ok >= 10 && z.np >= 5) u = 3; if (u >= 3 && z.test >= 1) u = 4; if (u >= 4 && roz >= 7) u = 5; return u; }

let ja = null, data = null;
const el = () => $("#zaci");

export async function nactiZaky(kdo) {
  ja = kdo; el().hidden = false; $("[data-z='pridat']", el()).hidden = !ja.spravce; $("#zaci-seznam").innerHTML = `<p class="pozn">Načítám…</p>`;
  try {
    const [profily, pristupy, stav, nastaveni, ucty] = await Promise.all([tabulka("profily?select=id,jmeno,naposledy,zablokovan&order=jmeno"), tabulka("pristupy?select=uzivatel,aplikace,role"),
      tabulka("stav?select=uzivatel,aplikace,data,upraveno"), tabulka("nastaveni?select=uzivatel,aplikace,data"), ja.spravce ? spravaUctu("seznam").catch(() => []) : Promise.resolve([])]);
    data = { profily: profily.filter((p) => p.id !== ja.id), pristupy, stav, nastaveni, ucty };
    kresli();
  } catch (e) { $("#zaci-seznam").innerHTML = `<p class="chyba">${esc(e.message)}</p>`; }
}

function souhrn(p) {
  const st = data.stav.find((s) => s.uzivatel === p.id && s.aplikace === "matika"), d = st && st.data;
  const body = cti(d, "body", {}).celkem || 0, vyr = Object.keys(cti(d, "vyreseno", {})).filter((k) => !k.startsWith("videl:")).length, posl = cti(d, "lekce-posledni", null), ur = cti(d, "urovne", {});
  return { body, vyr, posl, ur, ulozeno: st && st.upraveno };
}

function kresli() {
  const lidi = data.profily;
  $("#zaci-seznam").innerHTML = lidi.length ? lidi.map((p) => { const s = souhrn(p), pr = data.pristupy.filter((x) => x.uzivatel === p.id), u = data.ucty.find((x) => x.id === p.id);
    const temata = Object.entries(s.ur).filter(([, z]) => z && z.ok).map(([t, z]) => `<span class="tema" title="${z.ok}× správně">${esc(TEMATA[t] || t)} <b>${"●".repeat(uroven(z))}${"○".repeat(5 - uroven(z))}</b></span>`).join("");
    return `<article class="zak" data-uid="${p.id}">
      <div class="zak-hlava"><div><b>${esc(p.jmeno)}</b>${u ? `<small>přihlašuje se jako <code>${esc(u.prihlaseni)}</code></small>` : ""}</div><small>naposledy ${kdy(p.naposledy)}</small></div>
      <div class="stitky">${pr.map((x) => `<span class="stitek">${APP[x.aplikace] || esc(x.aplikace)} – ${ROLE[x.role] || esc(x.role)}</span>`).join("") || `<span class="stitek">bez přístupu</span>`}${p.zablokovan ? `<span class="stitek ne">zablokovaný</span>` : ""}</div>
      <dl class="cisla"><div><dt>Body</dt><dd>${s.body}</dd></div><div><dt>Vyřešeno</dt><dd>${s.vyr}</dd></div></dl>
      <p class="pozn">${s.posl ? `Naposledy v lekci <b>${esc(NAZEV[s.posl] || s.posl)}</b>.` : "Matika ještě nebyla otevřená."} ${s.ulozeno ? `Postup uložený ${kdy(s.ulozeno)}.` : ""}</p>
      ${temata ? `<div class="temata">${temata}</div>` : ""}
      ${pr.some((x) => x.aplikace === "matika" && x.role === "zak") ? `<div class="radek"><button type="button" class="hlavni" data-z="hodina" title="Všechno otevřené, nejdřív úlohy, které ještě nedělal(a). Nic se neuloží.">Hodina spolu</button><button type="button" data-z="zkouska" title="Přesně jeho / její verze. Body ani postup se neuloží.">Náhled žáka</button></div>` : ""}
      <div class="radek">${pr.some((x) => x.aplikace === "matika" && x.role === "zak") ? `<button type="button" data-z="lekce">Lekce a odemykání</button><button type="button" data-z="body">Body a odměny</button>` : ""}${ja.spravce ? `<button type="button" data-z="pristupy">Přístupy</button><button type="button" data-z="heslo">Nové heslo</button>` : ""}</div>
      <div class="panel" hidden></div></article>`; }).join("")
    : `<p class="pozn">Zatím tu nikdo není.${ja.spravce ? " Přidej prvního žáka tlačítkem nahoře." : ""}</p>`;
}

// ---------- panel: lekce a odemykání ----------
function panelLekce(karta, uid) {
  const n = data.nastaveni.find((x) => x.uzivatel === uid && x.aplikace === "matika"), z = (n && n.data && n.data.zak) || VYCHOZI_ZAK(), od = (z.odemceni && z.odemceni.lekce) || {};
  const stav = (k) => (!z.lekce.includes(k) ? "nema" : od[k] === "otevrit" ? "otevrit" : od[k] === "zavrit" ? "zavrit" : "postupne");
  $(".panel", karta).innerHTML = `<form class="lekce-form"><table class="lekce-tab"><tbody>${LEKCE.map(([k, nazev]) => `<tr><th>${nazev}</th><td><select name="${k}" aria-label="${nazev}">
      ${(k === "slovni" ? [["postupne", "otevřená"], ["nema", "nemá ji"]] : [["postupne", "postupně"], ["otevrit", "otevřená hned"], ["zavrit", "zavřená"], ["nema", "nemá ji"]]).map(([v, t]) => `<option value="${v}" ${stav(k) === v ? "selected" : ""}>${t}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>
    <div class="radek"><button type="button" data-z="zavrit">Zavřít</button><button type="submit" class="hlavni">Uložit</button></div><p class="pozn stav-panel" aria-live="polite">„Postupně“ = otevře se, až dokončí předchozí lekci.</p></form>`;
  $("form", karta).addEventListener("submit", async (e) => { e.preventDefault(); const f = e.target, info = $(".stav-panel", karta);
    const lekce = LEKCE.map(([k]) => k).filter((k) => f[k].value !== "nema"), odem = {}; lekce.forEach((k) => { if (f[k].value === "otevrit" || f[k].value === "zavrit") odem[k] = f[k].value; });
    if (!lekce.length) { info.textContent = "Nech aspoň jednu lekci."; return; }
    const nove = { ...z, lekce, odemceni: { ...(z.odemceni || {}), lekce: odem } };
    info.textContent = "Ukládám…";
    try { await zapsat("nastaveni", { aplikace: "matika", uzivatel: uid, upravil: ja.id, data: { ...((n && n.data) || {}), zak: nove } }, "aplikace,uzivatel");
      if (n) n.data = { ...(n.data || {}), zak: nove }; else data.nastaveni.push({ uzivatel: uid, aplikace: "matika", data: { zak: nove } });
      info.textContent = "Uloženo. Projeví se, až žák příště otevře Matiku."; } catch (x) { info.textContent = "Nepovedlo se uložit: " + x.message; } });
}

// ---------- panel: nastavit body (použije se jednou, při dalším otevření Matiky) ----------
function panelBody(karta, uid) {
  const n = data.nastaveni.find((x) => x.uzivatel === uid && x.aplikace === "matika"), z = (n && n.data && n.data.zak) || VYCHOZI_ZAK(), ted = souhrn({ id: uid }).body;
  $(".panel", karta).innerHTML = `<form class="body-form" novalidate><label class="radek-pole">Body <input name="body" type="number" min="0" max="100000" step="1" value="${ted}" inputmode="numeric"></label>
    <details class="odmeny-dariv"><summary>Dát odměnu dřív (${(z.odmeny || []).length})</summary><p class="pozn">Zaškrtnutá odměna se odemkne hned, i když na ni žák ještě nemá dost ⭐.</p>
      <div class="odmeny-mrizka">${ODMENY.map(([id, n, b]) => `<label class="zaskrt"><input type="checkbox" name="odmena" value="${id}" ${(z.odmeny || []).includes(id) ? "checked" : ""}> ${esc(n)} <span class="pozn">${b} ⭐</span></label>`).join("")}</div></details>
    <div class="radek"><button type="button" data-z="zavrit">Zavřít</button><button type="submit" class="hlavni">Uložit</button></div>
    <p class="pozn stav-panel" aria-live="polite">Teď má ${ted} bodů. Nové číslo se použije, až příště otevře Matiku – třeba když body z dřívějška zůstaly v jiném souboru.</p></form>`;
  $("form", karta).addEventListener("submit", async (e) => { e.preventDefault(); const info = $(".stav-panel", karta), v = e.target.body.value.trim();
    if (!/^\d{1,6}$/.test(v)) { info.textContent = "Napiš celé číslo 0 nebo víc."; return; }
    const odm = [...e.target.querySelectorAll('input[name="odmena"]:checked')].map((x) => x.value);
    const nove = { ...z, odmeny: odm, ...(+v !== ted ? { body: { celkem: +v, id: Date.now().toString(36) } } : {}) }; info.textContent = "Ukládám…";
    try { await zapsat("nastaveni", { aplikace: "matika", uzivatel: uid, upravil: ja.id, data: { ...((n && n.data) || {}), zak: nove } }, "aplikace,uzivatel");
      if (n) n.data = { ...(n.data || {}), zak: nove }; else data.nastaveni.push({ uzivatel: uid, aplikace: "matika", data: { zak: nove } });
      info.textContent = `Uloženo${+v !== ted ? ` – ${+v} bodů` : ""}${odm.length ? `, odměny dřív: ${odm.length}` : ""}. Projeví se, až příště otevře Matiku.`; } catch (x) { info.textContent = "Nepovedlo se uložit: " + x.message; } });
}

// ---------- panel: přístupy a zablokování (jen správce) ----------
function panelPristupy(karta, uid) {
  const p = data.profily.find((x) => x.id === uid) || {}, role = (app) => (data.pristupy.find((x) => x.uzivatel === uid && x.aplikace === app) || {}).role || "nema";
  $(".panel", karta).innerHTML = `<form class="pristupy-form" novalidate><table class="lekce-tab"><tbody>${Object.entries(APP).map(([a, n]) => `<tr><th>${n}</th><td><select name="${a}" aria-label="Přístup – ${n}">
      ${[["nema", "nemá přístup"], ["zak", "žák"], ["host", "host"], ["lektor", "lektor"]].map(([v, t]) => `<option value="${v}" ${role(a) === v ? "selected" : ""}>${t}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>
    <label class="zaskrt"><input type="checkbox" name="blok" ${p.zablokovan ? "checked" : ""}> Zablokovat – do aplikací se nedostane, postup zůstane uložený</label>
    <div class="radek"><button type="button" data-z="zavrit">Zavřít</button><button type="submit" class="hlavni">Uložit</button></div><p class="pozn stav-panel" aria-live="polite">Lektor vidí jen žáky z aplikací, kde je sám lektorem.</p></form>`;
  $("form", karta).addEventListener("submit", async (e) => { e.preventDefault(); const f = e.target, info = $(".stav-panel", karta); info.textContent = "Ukládám…";
    try {
      for (const a of Object.keys(APP)) { const v = f[a].value; if (v === role(a)) continue;
        if (v === "nema") await api(`/rest/v1/pristupy?uzivatel=eq.${uid}&aplikace=eq.${a}`, { method: "DELETE" });
        else await zapsat("pristupy", { uzivatel: uid, aplikace: a, role: v }, "uzivatel,aplikace"); }
      if (!!p.zablokovan !== f.blok.checked) await api(`/rest/v1/profily?id=eq.${uid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zablokovan: f.blok.checked }) });
      await nactiZaky(ja); $("#pridat-stav").textContent = `Přístupy uloženy (${p.jmeno || "účet"}).`;
    } catch (x) { info.textContent = "Nepovedlo se uložit: " + x.message; } });
}

// ---------- panel: nové heslo (jen správce) ----------
function panelHeslo(karta, uid) {
  $(".panel", karta).innerHTML = `<form class="heslo-form" novalidate><label>Nové heslo (aspoň 8 znaků)<input name="heslo" type="text" autocomplete="new-password" spellcheck="false" minlength="8" required></label>
    <div class="radek"><button type="button" data-z="zavrit">Zavřít</button><button type="submit" class="hlavni">Nastavit heslo</button></div><p class="pozn stav-panel" aria-live="polite">Heslo se uloží jen na serveru přihlašování. Řekni ho žákovi a v prohlížeči si ho může nechat zapamatovat.</p></form>`;
  $("form", karta).addEventListener("submit", async (e) => { e.preventDefault(); const f = e.target, info = $(".stav-panel", karta);
    if (f.heslo.value.length < 8) { info.textContent = "Heslo musí mít aspoň 8 znaků."; return; }
    info.textContent = "Nastavuji…"; try { await spravaUctu("heslo", { uid, heslo: f.heslo.value }); f.heslo.value = ""; info.textContent = "Hotovo – nové heslo platí."; } catch (x) { info.textContent = x.message; } });
}

// ---------- přidat žáka (jen správce) ----------
async function pridat(f) { const info = $("#pridat-stav");
  const appky = [...f.querySelectorAll("[name=app]:checked")].map((c) => ({ id: c.value, role: "zak" }));
  if (f.heslo.value.length < 8) { info.textContent = "Heslo musí mít aspoň 8 znaků."; return; }
  info.textContent = "Zakládám…";
  try { await spravaUctu("zalozit", { jmeno: f.jmeno.value, prihlaseni: f.prihlaseni.value, heslo: f.heslo.value, aplikace: appky });
    info.textContent = `Hotovo. ${f.jmeno.value} se přihlásí jménem „${f.prihlaseni.value.trim().toLowerCase()}“ a heslem, které jsi zadal.`; f.reset(); delete f.prihlaseni.dataset.rucne; f.hidden = true; await nactiZaky(ja); }
  catch (x) { info.textContent = x.message; } }

document.addEventListener("click", (e) => { const b = e.target.closest("[data-z]"); if (!b || !el() || !el().contains(b)) return; const karta = b.closest(".zak"), uid = karta && karta.dataset.uid;
  if (b.dataset.z === "pridat") { const f = $("#form-pridat"); f.hidden = !f.hidden; if (!f.hidden) f.jmeno.focus(); return; }
  if (b.dataset.z === "zavrit") { const p = b.closest(".panel"); p.hidden = true; p.innerHTML = ""; return; }
  if (b.dataset.z === "hodina" || b.dataset.z === "zkouska") { const p = data.profily.find((x) => x.id === uid);
    document.dispatchEvent(new CustomEvent("ucebna-nahled", { detail: { uid, jmeno: p ? p.jmeno : "", rezim: b.dataset.z } })); return; }
  const p = $(".panel", karta); if (!p.hidden && p.dataset.co === b.dataset.z) { p.hidden = true; p.innerHTML = ""; return; }
  p.dataset.co = b.dataset.z; p.hidden = false;
  if (b.dataset.z === "lekce") panelLekce(karta, uid); if (b.dataset.z === "heslo") panelHeslo(karta, uid); if (b.dataset.z === "body") panelBody(karta, uid); if (b.dataset.z === "pristupy") panelPristupy(karta, uid); });
document.addEventListener("submit", (e) => { if (e.target.id === "form-pridat") { e.preventDefault(); pridat(e.target); } });
// přihlašovací jméno z jména: „Petr Novák“ → „petr.novak“
document.addEventListener("input", (e) => { if (e.target.name !== "jmeno" || !e.target.closest("#form-pridat")) return; const f = e.target.form;
  if (f.prihlaseni.dataset.rucne) return; f.prihlaseni.value = e.target.value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "").slice(0, 30); });
document.addEventListener("input", (e) => { if (e.target.name === "prihlaseni") e.target.dataset.rucne = "1"; });
