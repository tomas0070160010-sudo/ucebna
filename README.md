# Učebna

Stránka pro doučování a hry (přihlášení přes Supabase projekt `ucebna`).

## Verze
- **0.4** (10. 11. 2026, větev `zaci`, čeká na schválení) – sekce Žáci pro lektora a správce: přístupy, poslední přihlášení, minuty učení (7 dní / dnes), body, vyřešené úlohy, poslední lekce a úrovně témat; lektor nastaví lekce, odemykání a denní cíl; správce přidá žáka (bez e-mailu) a nastaví nové heslo přes funkci `ucet` (`supabase/funkce/ucet.ts`).
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
