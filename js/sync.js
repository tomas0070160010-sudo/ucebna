// Synchronizace dat aplikace (klíče v localStorage s předponou, např. „matika-“) s tabulkou stav.
// Celek se ukládá jako jeden JSON. Novější vyhrává: server, když se změnil od poslední synchronizace tady.
import { tabulka, zapsat } from "./server.js";

const meta = (app) => { try { return JSON.parse(localStorage.getItem("ucebna-sync-" + app)) || {}; } catch (e) { return {}; } };
const ulozMeta = (app, m) => { try { localStorage.setItem("ucebna-sync-" + app, JSON.stringify(m)); } catch (e) { /* bez úložiště */ } };
const otisk = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return s.length + ":" + h; };

export function mistni(predpona) { const o = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(predpona)) o[k] = localStorage.getItem(k); }
  return o; }
function prepis(predpona, data) {
  const pryc = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(predpona)) pryc.push(k); }
  pryc.forEach((k) => localStorage.removeItem(k));
  Object.entries(data || {}).forEach(([k, v]) => { if (k.startsWith(predpona) && typeof v === "string") localStorage.setItem(k, v); });
}
export function smazMistni(app, predpona) { prepis(predpona, {}); try { localStorage.removeItem("ucebna-sync-" + app); } catch (e) { /* nic */ } }

// před spuštěním aplikace: stáhne stav ze serveru, když je novější (nebo tu má data někdo jiný)
export async function stahnout(app, predpona, uid) {
  const m = meta(app), cizi = m.uid && m.uid !== uid;
  if (cizi) prepis(predpona, {}); // na sdíleném zařízení nemíchat data dvou lidí
  const [r] = await tabulka(`stav?select=data,upraveno&uzivatel=eq.${uid}&aplikace=eq.${app}`);
  const zmenenoTady = !cizi && m.otisk && otisk(JSON.stringify(mistni(predpona))) !== m.otisk;
  if (r && (cizi || !m.cas || r.upraveno > m.cas) && !(zmenenoTady && r.upraveno <= m.cas)) {
    prepis(predpona, r.data); ulozMeta(app, { uid, cas: r.upraveno, otisk: otisk(JSON.stringify(mistni(predpona))) }); return "server";
  }
  if (!r) ulozMeta(app, { uid, cas: m.cas || null, otisk: null });
  return "mistni";
}

// průběžně: když se data tady změnila, pošle je na server
export async function nahrat(app, predpona, uid) {
  const m = meta(app), data = mistni(predpona), o = otisk(JSON.stringify(data));
  if (m.uid === uid && o === m.otisk) return false;
  const [r] = await zapsat("stav", { uzivatel: uid, aplikace: app, data }, "uzivatel,aplikace"); // čas změny dává server
  ulozMeta(app, { uid, cas: r ? r.upraveno : m.cas, otisk: o }); return true;
}

// je na serveru novější verze, než jakou máme tady (jiné zařízení mezitím ukládalo)?
export async function serverNovejsi(app, uid) {
  const m = meta(app); const [r] = await tabulka(`stav?select=upraveno&uzivatel=eq.${uid}&aplikace=eq.${app}`);
  return !!(r && m.cas && r.upraveno > m.cas);
}
