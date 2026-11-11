# Učebna

Stránka pro doučování a hry (přihlášení přes Supabase projekt `ucebna`).

## Verze
- **0.8.13** (11. 11. 2026) – Hry: Člověče s mapami (Klasická, Malá pro dva, Ostrov s mosty, Témata) a kostkami (klasická, dvě kostky ±, zlomková, s ❓); texty karet bez rodu. Matika 3.29 pro žáky i hosty. Pojistka v pravidlech úložiště (`supabase/migrace/0.8.12-host-jen-testy.sql`) se podle rozhodnutí Tomáše 11. 11. nepoužije – klíče, archy a lektorskou verzi host nedostane ani bez ní.
- **0.8.12** (11. 11. 2026) – Host v Matice: Učebna mu načte Matiku pro hosty (host.html – lekce, hry a prázdné testy z přijímaček, bez řešení, klíčů a archu); funkce „soubor“ hostovi plnou Matiku nevydá; Přidat → „hosta“ dá Matiku i Hry v roli host. Pravidlo úložiště jako pojistka čeká na OK (migrace 0.8.12).
- **0.8.11** (11. 11. 2026) – Žáci › Přidat: účet pro hosta = jen Hry (role host); v Přístupech už host do Matiky nejde nastavit – Matika má testy a řešení jen pro doučování.
- **0.8.10** (11. 11. 2026) – Hry: v Člověče zavře kartu počítače počítač sám (rychle, když hraje i člověk, déle, když hrají jen počítače), pod kartou ubývá pruh, klepnutím zmizí hned; Žáci › Body a odměny: lektor může dát dřív i 8 živých pozadí stránky z Matiky 3.28.
- **0.8.9** (11. 11. 2026) – Správa › PDF testů: nahrání jedním souborem .zip (rozbalí se v prohlížeči, uložené i zabalené soubory), jasná hláška u rozbitého zipu.
- **0.8.8** (11. 11. 2026) – stránka her: Člověče, nezlob se 2.0 – figurka jde pole po poli, 20 akčních políček (Náhoda, Truhla, Bezpečné, Zkratka, Led, Vír, Otázka, Výzva), karta uprostřed desky pro všechny.
- **0.8.7** (11. 11. 2026) – stránka her: Tetris se zlomky začíná s předem poskládaným obrázkem z fialových čtverečků (výška podle obtížnosti, nejvýš půl hřiště), na Lehké a Střední občas padá větší dílek, online mají oba hráči stejný obrázek.
- **0.8.6** (11. 11. 2026) – Žáci › Body a odměny: lektor může dát odměnu za hvězdičky dřív (zaškrtnutím); stránka her: piškvorky na telefonu na poli 12 × 12, vzhled kostek v Tetrisu. Potřebuje Matiku 3.23.
- **0.8.5** (11. 11. 2026) – stránka her na telefonu: hra se otevře přes celou obrazovku (všechno vidět, zavře ji i tlačítko Zpět), tlačítka větší pro prst. Potřebuje Matiku 3.22.2.
- **0.8.4** (10. 11. 2026) – stránka her: Tetris jde ovládat prstem na desce (táhni, klepni, švihni dolů); Správa › PDF testů pozná i soubor stažený z Matiky (`matika-2025-A-test.pdf`). Potřebuje Matiku 3.22.
- **0.8.3** (10. 11. 2026) – stránka her: Tetris má rychlý návod (jde přeskočit, ❓ Jak hrát). Potřebuje Matiku 3.21.
- **0.8.2** (10. 11. 2026) – stránka her: Tetris online souboj (kód nebo QR kód, stejný čas, pauza u obou), způsob odpovědi určí hra, pokusy, pomalý dopad, WSAD. Potřebuje Matiku 3.20.
- **0.8.1** (10. 11. 2026) – stránka her: nová hra Tetris se zlomky (nejdřív zjednoduš, pak poskládej; obtížnost podle hráče). Potřebuje Matiku 3.19.
- **0.8** (10. 11. 2026) – stránka her: vzdělávací hry Závod v počítání (i online), Odhadovačka na ose (i online), Had s čísly, Úhlové dělo; obtížnost Lehká / Střední / Obtížná / Lektorská – každý hráč si volí svou. Potřebuje Matiku 3.17.
- **0.7** (10. 11. 2026) – veřejná stránka `hry/` bez přihlášení a bez dat: lodě, piškvorky, ping-pong a had online (soupeř načte QR kód z Matiky nebo ze stránky her), Člověče a pexeso. Odkaz „Jen hry – bez přihlášení“ na přihlášení. `hry/index.html` se sestavuje ze stejných souborů her jako Matika (`sestav-hry.py`) – neupravovat ručně. Potřebuje Matiku 3.16 (QR kód míří sem).
- **0.6** (10. 11. 2026) – PDF testů v zamčeném úložišti: Správa › PDF testů nahraje všechny najednou (názvy z CERMATu se převedou, zadání do `matika/testy/`, klíče a vyplněné archy do `matika/klice/` – ty pustí úložiště jen lektorovi); Matika v Učebně je otevírá přes `window.__nactiPdf` a kreslí pdf.js (funguje i na telefonu). Žáci › **Přístupy** (správce): role v Matice a Hrách, odebrat přístup, zablokovat účet. Pravidlo úložiště `supabase/migrace/0.6-klice-jen-lektor.sql` (klíče jen lektor, nasazeno 10. 11.). Potřebuje Matiku 3.15.1.
- **0.5** (10. 11. 2026) – bez tlaku: Učebna neměří čas učení, v lekcích není denní cíl; Žáci: **Hodina spolu** (celá Matika otevřená, nejdřív úlohy, které žák ještě nedělal, nic se neuloží) a **Náhled žáka** (přesně jeho verze, nic se neuloží; vlastní data lektora jsou mezitím stranou a vrátí se i po zavření stránky), **Nastavit body** (`nastaveni.zak.body`, Matika ho použije jednou); dlaždice **Hry** otevře Matiku u her (online lodě a piškvorky přes server). Potřebuje Matiku 3.15.
- **0.4** (10. 11. 2026) – sekce Žáci pro lektora a správce: přístupy, poslední přihlášení, minuty učení (7 dní / dnes), body, vyřešené úlohy, poslední lekce a úrovně témat; lektor nastaví lekce, odemykání a denní cíl; správce přidá žáka (bez e-mailu) a nastaví nové heslo přes funkci `ucet` na serveru (`supabase/funkce/ucet.ts`, kontrola nastavení `?stav=1`).
- **0.3** (10. 11. 2026) – Matika se načítá přes funkci `soubor` na serveru ze soukromého repozitáře `ucebna-soubory` (vždy nejnovější verze, nic se nenahrává ručně); ručně nahraný soubor je jen záloha.
- **0.2** (10. 11. 2026) – jeden soubor Matiky pro všechny: žákovskou verzi si Učebna složí sama z nastavení lektora (tabulka `nastaveni`, klíč `zak`).
- **0.1** (10. 11. 2026) – přihlášení jménem nebo e-mailem a heslem, dlaždice aplikací, Matika ze zamčeného úložiště v rámu s automatickým ukládáním postupu (tabulka `stav`), aktivita, Správa souborů pro správce.

## Jak to funguje
- `js/server.js` – přihlášení, tabulky a úložiště přes REST (bez knihoven), veřejný publishable klíč.
- `js/sync.js` – klíče aplikace v prohlížeči (např. `matika-…`) ↔ řádek v tabulce `stav`; novější vyhrává, čas dává server.
- `js/app.js` – obrazovky: přihlášení, domů, spuštěná aplikace, Správa.
- `supabase/funkce/soubor.ts` – funkce na serveru: ověří přístup (pravidla v databázi) a vrátí soubor ze soukromého repozitáře; klíč `GITHUB_TOKEN` jen v Supabase › Edge Functions › Secrets.
- Jméno bez zavináče se přihlásí jako `jmeno@ucebna.invalid` (účty bez e-mailu).

- Veřejná adresa: https://tomas0070160010-sudo.github.io/ucebna/
- `supabase/schema.sql` – tabulky a pravidla přístupu (stav po migracích z 10. 11. 2026).

Do repozitáře nikdy: hesla, tajné klíče (jen veřejný publishable klíč), osobní data, testy a klíče CERMAT, Matika po krocích.
