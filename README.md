# Učebna

Stránka pro doučování a hry (přihlášení přes Supabase projekt `ucebna`).

## Verze
- **0.1** (10. 11. 2026) – přihlášení jménem nebo e-mailem a heslem, dlaždice aplikací, Matika ze zamčeného úložiště v rámu s automatickým ukládáním postupu (tabulka `stav`), aktivita, Správa souborů pro správce.

## Jak to funguje
- `js/server.js` – přihlášení, tabulky a úložiště přes REST (bez knihoven), veřejný publishable klíč.
- `js/sync.js` – klíče aplikace v prohlížeči (např. `matika-…`) ↔ řádek v tabulce `stav`; novější vyhrává, čas dává server.
- `js/app.js` – obrazovky: přihlášení, domů, spuštěná aplikace, Správa.
- Jméno bez zavináče se přihlásí jako `jmeno@ucebna.invalid` (účty bez e-mailu).

- Veřejná adresa: https://tomas0070160010-sudo.github.io/ucebna/
- `supabase/schema.sql` – tabulky a pravidla přístupu (stav po migracích z 10. 11. 2026).

Do repozitáře nikdy: hesla, tajné klíče (jen veřejný publishable klíč), osobní data, testy a klíče CERMAT, Matika po krocích.
