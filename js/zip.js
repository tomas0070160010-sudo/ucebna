// Rozbalení .zip v prohlížeči bez knihoven: čte ústřední adresář na konci souboru.
// Uložené soubory (metoda 0) se jen vyříznou, zabalené (metoda 8) rozbalí DecompressionStream("deflate-raw").
export async function rozbalZip(data) {
  const b = new Uint8Array(data), v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let k = -1; for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { k = i; break; }
  if (k < 0) throw new Error("Tohle není soubor .zip.");
  const pocet = v.getUint16(k + 10, true), dek = new TextDecoder(), ven = [];
  let p = v.getUint32(k + 16, true);
  for (let n = 0; n < pocet; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("Poškozený .zip.");
    const metoda = v.getUint16(p + 10, true), zab = v.getUint32(p + 20, true), dl = v.getUint16(p + 28, true), ex = v.getUint16(p + 30, true), ko = v.getUint16(p + 32, true), lok = v.getUint32(p + 42, true);
    const jmeno = dek.decode(b.subarray(p + 46, p + 46 + dl)); p += 46 + dl + ex + ko;
    if (jmeno.endsWith("/")) continue;
    const z = lok + 30 + v.getUint16(lok + 26, true) + v.getUint16(lok + 28, true), surova = b.subarray(z, z + zab);
    let obsah;
    if (metoda === 0) obsah = surova.slice();
    else if (metoda === 8 && typeof DecompressionStream === "function") obsah = new Uint8Array(await new Response(new Blob([surova]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    else throw new Error("Tenhle .zip neumím rozbalit – nahraj PDF přímo.");
    ven.push({ jmeno: jmeno.split("/").pop(), obsah });
  }
  return ven;
}
