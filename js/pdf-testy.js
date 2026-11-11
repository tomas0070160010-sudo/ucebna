// PDF testů pro Matiku v Učebně: leží v zamčeném úložišti (bucket „aplikace“).
// matika/testy/ – zadání (vidí každý s přístupem k Matice), matika/klice/ – klíče a vyplněné archy (jen lektor a správce).
// Správce je nahraje ve Správě najednou; názvy z CERMATu (M9A_2026_TS.pdf …) se převedou na tvar Matiky (2026-A-test.pdf).
import { api, nahratSoubor, seznamSouboru } from "./server.js";
import { rozbalZip } from "./zip.js";

const $ = (s, r = document) => r.querySelector(s);
const TYP = { ts: "test", test: "test", ksr: "klic", klic: "klic", vza: "arch", arch: "arch" };

// „2025-A-test.pdf“, „matika-2025-A-test.pdf“, „M9A_2026_TS.pdf“, „M9A_2025_rozsireny_klic.pdf“ → „2025-A-test.pdf“; jinak null
export function nazevPdf(soubor) {
  const n = soubor.toLowerCase().replace(/\s*\(\d+\)(?=\.pdf$)/, "").replace(/^matika-/, ""); // i soubor stažený z Matiky („matika-2025-A-test.pdf“)
  let m = /^(\d{4})-([a-d])-(test|klic|arch)\.pdf$/.exec(n);
  if (m) return `${m[1]}-${m[2].toUpperCase()}-${m[3]}.pdf`;
  m = /m9([a-d])_(\d{4})_(?:rozsireny_)?(ts|ksr|klic|vza)\b/.exec(n);
  return m ? `${m[2]}-${m[1].toUpperCase()}-${TYP[m[3]]}.pdf` : null;
}
export const cestaPdf = (nazev) => `matika/${/-(klic|arch)\.pdf$/.test(nazev) ? "klice" : "testy"}/${nazev}`;

// pro Matiku v rámu: odpověď serveru s PDF (zamčené úložiště pustí klíče jen lektorovi)
export const souborPdf = (nazev) => api("/storage/v1/object/authenticated/aplikace/" + cestaPdf(nazev), { vratitChybu: true });

export async function kresliPdf() {
  const el = $("#pdf-testy"); if (!el) return;
  let t = [], k = []; try { [t, k] = await Promise.all([seznamSouboru("matika/testy/"), seznamSouboru("matika/klice/")]); } catch (e) { /* ukáže se 0 */ }
  const pdf = (s) => s.filter((x) => /\.pdf$/.test(x.name)).length;
  el.innerHTML = `<div class="soubor"><div><b>PDF testů</b><small>V Učebně je ${pdf(t)} zadání a ${pdf(k)} klíčů a vyplněných archů. Vyber najednou všechny PDF testů ze složky – zadání (M9A_2026_TS.pdf), klíče (…_KSR.pdf) i vzorové archy (…_VZA.pdf) – nebo jeden .zip, ve kterém jsou. Zadání uvidí žák s přístupem k Matice, klíče jen lektor.</small></div>
    <label class="tl">Nahrát PDF…<input type="file" accept=".pdf,.zip,application/pdf,application/zip" multiple data-nahrat-pdf hidden></label></div>`;
}

document.addEventListener("change", async (e) => { const i = e.target.closest("[data-nahrat-pdf]"); if (!i || !i.files.length) return;
  const st = $("#sprava-stav"), vybrane = [...i.files], soubory = []; i.value = "";
  // .zip se rozbalí tady v prohlížeči; dál jde každé PDF z něj jako samostatný soubor
  for (const f of vybrane) { if (!/\.zip$/i.test(f.name)) { soubory.push(f); continue; }
    st.textContent = `Rozbaluji ${f.name}…`;
    try { (await rozbalZip(await f.arrayBuffer())).filter((x) => /\.pdf$/i.test(x.jmeno)).forEach((x) => soubory.push(new File([x.obsah], x.jmeno, { type: "application/pdf" }))); }
    catch (x) { st.textContent = x.message; return; } }
  const dobre = soubory.map((f) => [f, nazevPdf(f.name)]).filter(([, n]) => n), spatne = soubory.filter((f) => !nazevPdf(f.name)).map((f) => f.name);
  let hotovo = 0, chyby = 0;
  for (const [f, n] of dobre) { st.textContent = `Nahrávám PDF ${hotovo + chyby + 1} z ${dobre.length}…`;
    try { await nahratSoubor(cestaPdf(n), new Blob([await f.arrayBuffer()], { type: "application/pdf" })); hotovo++; } catch (x) { chyby++; } }
  st.textContent = `Nahráno ${hotovo} PDF.${chyby ? ` Nepovedlo se ${chyby}.` : ""}${spatne.length ? ` Přeskočeno (neznámý název): ${spatne.slice(0, 5).join(", ")}${spatne.length > 5 ? "…" : ""}` : ""}`;
  kresliPdf(); });
