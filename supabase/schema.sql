-- =====================================================================
-- Učebna (Supabase projekt „ucebna“): doučování, hry, další malé aplikace
-- Tabulky + pravidla přístupu (RLS). Spuštěno 10. 11. 2026 přes konektor (migrace ucebna_zaklad + ucebna_pravidla_uprava),
-- tady ve výsledném tvaru. Ověřeno: žák vidí jen své, lektor své žáky, cizí nic, správce všechno.
-- Žádné osobní údaje tu nejsou, dokud správce nezaloží účty.
-- =====================================================================

-- ---------- aplikace (Matika po krocích, Hry, další doučka…) ----------
create table public.aplikace (
  id        text primary key,                 -- 'matika', 'hry', …
  nazev     text not null,
  popis     text,
  vytvoreno timestamptz not null default now()
);

-- ---------- profily (1 : 1 k auth.users, vzniká samo při založení účtu) ----------
create table public.profily (
  id         uuid primary key references auth.users on delete cascade,
  jmeno      text not null,                   -- jak se zobrazuje (může být přezdívka)
  role       text not null default 'uzivatel' check (role in ('spravce', 'uzivatel')),
  poznamka   text,                            -- jen pro správce
  zablokovan boolean not null default false,
  vytvoreno  timestamptz not null default now(),
  naposledy  timestamptz                      -- poslední aktivita (zapis_aktivitu)
);

-- ---------- přístupy: kdo smí do které aplikace a v jaké roli ----------
create table public.pristupy (
  uzivatel  uuid not null references public.profily on delete cascade,
  aplikace  text not null references public.aplikace on delete cascade,
  role      text not null default 'zak' check (role in ('lektor', 'zak', 'host')),
  od        date not null default current_date,
  do_       date,                             -- volitelný konec přístupu
  primary key (uzivatel, aplikace)
);
create index on public.pristupy (aplikace, role);

-- ---------- stav aplikace pro uživatele (data z prohlížeče jako JSON) ----------
create table public.stav (
  uzivatel  uuid not null references public.profily on delete cascade,
  aplikace  text not null references public.aplikace on delete cascade,
  data      jsonb not null default '{}',
  upraveno  timestamptz not null default now(),
  primary key (uzivatel, aplikace)
);
create index on public.stav (aplikace);

-- ---------- nastavení od lektora pro konkrétního uživatele (odemykání, rytmus, cíl) ----------
create table public.nastaveni (
  aplikace  text not null references public.aplikace on delete cascade,
  uzivatel  uuid not null references public.profily on delete cascade,
  data      jsonb not null default '{}',
  upravil   uuid references public.profily on delete set null,
  upraveno  timestamptz not null default now(),
  primary key (aplikace, uzivatel)
);
create index on public.nastaveni (uzivatel);
create index on public.nastaveni (upravil);

-- ---------- aktivita (přihlášení, otevření aplikace, minuty učení) – jen pro přehled ----------
create table public.aktivita (
  id        bigserial primary key,
  uzivatel  uuid not null references public.profily on delete cascade,
  aplikace  text references public.aplikace on delete cascade,
  udalost   text not null check (udalost in ('prihlaseni', 'otevreni', 'uceni', 'hra', 'odhlaseni')),
  minuty    int,
  kdy       timestamptz not null default now()
);
create index on public.aktivita (uzivatel, kdy desc);
create index on public.aktivita (aplikace);

-- ---------- uložené hry na účet (Člověče, piškvorky, lodě…) ----------
create table public.hry (
  id        uuid primary key default gen_random_uuid(),
  druh      text not null check (druh in ('clovece', 'piskvorky', 'lode')),
  hraci     uuid[] not null,                  -- účty, které hru vidí a můžou v ní pokračovat
  stav      jsonb not null,
  skonceno  boolean not null default false,
  upraveno  timestamptz not null default now()
);
create index on public.hry using gin (hraci);

-- ---------- souhlasy (zásady, souhlas zákonného zástupce u nezletilých) ----------
create table public.souhlasy (
  id        bigserial primary key,
  uzivatel  uuid not null references public.profily on delete cascade,
  druh      text not null check (druh in ('zasady', 'zakonny_zastupce')),
  verze     text not null,                    -- verze textu zásad, např. '1.0'
  kdo       text,                             -- u zástupce: kdo souhlasil (např. „matka“), bez dalších údajů
  kdy       timestamptz not null default now()
);
create index on public.souhlasy (uzivatel);

-- =====================================================================
-- Pomocné funkce ve schématu privat (nejsou volatelné přes API); v public jen zapis_aktivitu
-- =====================================================================
create schema if not exists privat;
revoke all on schema privat from public, anon;
grant usage on schema privat to authenticated;

create or replace function privat.je_spravce() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profily where id = (select auth.uid()) and role = 'spravce' and not zablokovan);
$$;
create or replace function privat.role_v(app text) returns text language sql stable security definer set search_path = public as $$
  select p.role from pristupy p join profily u on u.id = p.uzivatel
  where p.uzivatel = (select auth.uid()) and p.aplikace = app and not u.zablokovan
    and p.od <= current_date and (p.do_ is null or p.do_ >= current_date);
$$;
-- lektor vidí jen žáky z aplikací, kde je sám platným lektorem
create or replace function privat.je_lektor_pro(zak uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pristupy z where z.uzivatel = zak and privat.role_v(z.aplikace) = 'lektor');
$$;
-- nový účet (zakládá jen správce, registrace je vypnutá) → prázdný profil bez osobních údajů
create or replace function privat.novy_ucet() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profily (id, jmeno) values (new.id, coalesce(nullif(new.raw_user_meta_data->>'jmeno', ''), 'Nový účet'));
  return new;
end $$;
create trigger novy_ucet after insert on auth.users for each row execute function privat.novy_ucet();
-- zápis aktivity + „naposledy“ jedním voláním z aplikace: select zapis_aktivitu('matika', 'uceni', 12); přihlášení: app = null
create or replace function public.zapis_aktivitu(app text, co text, min int default null) returns void language sql security definer set search_path = public as $$
  insert into aktivita (uzivatel, aplikace, udalost, minuty)
    select (select auth.uid()), app, co, min where (select auth.uid()) is not null and (app is null or privat.role_v(app) is not null or privat.je_spravce());
  update profily set naposledy = now() where id = (select auth.uid());
$$;
-- čas změny vždy podle serveru (hodiny v zařízeních se můžou lišit)
create or replace function privat.cas_upravy() returns trigger language plpgsql set search_path = public as $$
begin new.upraveno := now(); return new; end $$;
revoke execute on all functions in schema privat from public, anon, authenticated; -- (cas_upravy a novy_ucet volají jen triggery)
grant execute on function privat.je_spravce(), privat.role_v(text), privat.je_lektor_pro(uuid) to authenticated;
revoke execute on function public.zapis_aktivitu(text, text, int) from public, anon;
grant execute on function public.zapis_aktivitu(text, text, int) to authenticated;

-- =====================================================================
-- Row Level Security – čtení jednou politikou na tabulku, zápis zvlášť (bez překrývání)
-- =====================================================================
alter table public.aplikace  enable row level security;
alter table public.profily   enable row level security;
alter table public.pristupy  enable row level security;
alter table public.stav      enable row level security;
alter table public.nastaveni enable row level security;
alter table public.aktivita  enable row level security;
alter table public.hry       enable row level security;
alter table public.souhlasy  enable row level security;

create policy "aplikace: čtení" on public.aplikace for select to authenticated using (privat.je_spravce() or privat.role_v(id) is not null);
create policy "aplikace: přidá správce" on public.aplikace for insert to authenticated with check (privat.je_spravce());
create policy "aplikace: upraví správce" on public.aplikace for update to authenticated using (privat.je_spravce()) with check (privat.je_spravce());
create policy "aplikace: smaže správce" on public.aplikace for delete to authenticated using (privat.je_spravce());

create policy "profily: čtení" on public.profily for select to authenticated using (id = (select auth.uid()) or privat.je_spravce() or privat.je_lektor_pro(id));
create policy "profily: přidá správce" on public.profily for insert to authenticated with check (privat.je_spravce());
create policy "profily: upraví správce" on public.profily for update to authenticated using (privat.je_spravce()) with check (privat.je_spravce());
create policy "profily: smaže správce" on public.profily for delete to authenticated using (privat.je_spravce());

create policy "přístupy: čtení" on public.pristupy for select to authenticated using (uzivatel = (select auth.uid()) or privat.je_spravce());
create policy "přístupy: přidá správce" on public.pristupy for insert to authenticated with check (privat.je_spravce());
create policy "přístupy: upraví správce" on public.pristupy for update to authenticated using (privat.je_spravce()) with check (privat.je_spravce());
create policy "přístupy: smaže správce" on public.pristupy for delete to authenticated using (privat.je_spravce());

create policy "stav: čtení" on public.stav for select to authenticated using (
  (uzivatel = (select auth.uid()) and privat.role_v(aplikace) is not null) or privat.je_spravce() or (privat.role_v(aplikace) = 'lektor' and privat.je_lektor_pro(uzivatel)));
create policy "stav: zapíše svůj" on public.stav for insert to authenticated with check (uzivatel = (select auth.uid()) and privat.role_v(aplikace) is not null);
create policy "stav: upraví svůj" on public.stav for update to authenticated using (uzivatel = (select auth.uid()) and privat.role_v(aplikace) is not null) with check (uzivatel = (select auth.uid()) and privat.role_v(aplikace) is not null);
create policy "stav: smaže svůj" on public.stav for delete to authenticated using (uzivatel = (select auth.uid()));

create policy "nastavení: čtení" on public.nastaveni for select to authenticated using (
  uzivatel = (select auth.uid()) or privat.je_spravce() or (privat.role_v(aplikace) = 'lektor' and privat.je_lektor_pro(uzivatel)));
create policy "nastavení: přidá lektor nebo správce" on public.nastaveni for insert to authenticated with check (privat.je_spravce() or (privat.role_v(aplikace) = 'lektor' and privat.je_lektor_pro(uzivatel)));
create policy "nastavení: upraví lektor nebo správce" on public.nastaveni for update to authenticated
  using (privat.je_spravce() or (privat.role_v(aplikace) = 'lektor' and privat.je_lektor_pro(uzivatel)))
  with check (privat.je_spravce() or (privat.role_v(aplikace) = 'lektor' and privat.je_lektor_pro(uzivatel)));
create policy "nastavení: smaže lektor nebo správce" on public.nastaveni for delete to authenticated using (privat.je_spravce() or (privat.role_v(aplikace) = 'lektor' and privat.je_lektor_pro(uzivatel)));

create policy "aktivita: čtení" on public.aktivita for select to authenticated using (uzivatel = (select auth.uid()) or privat.je_spravce());
-- zápis aktivity jen přes funkci zapis_aktivitu (žádná insert policy)

create policy "hry: jen hráči" on public.hry for all to authenticated using ((select auth.uid()) = any (hraci)) with check ((select auth.uid()) = any (hraci));

create policy "souhlasy: čtení" on public.souhlasy for select to authenticated using (uzivatel = (select auth.uid()) or privat.je_spravce());
create policy "souhlasy: zapíše sám uživatel" on public.souhlasy for insert to authenticated with check (uzivatel = (select auth.uid()));

create trigger cas_upravy before insert or update on public.stav for each row execute function privat.cas_upravy();
create trigger cas_upravy before insert or update on public.nastaveni for each row execute function privat.cas_upravy();
create trigger cas_upravy before insert or update on public.hry for each row execute function privat.cas_upravy();

-- ---------- soukromé úložiště souborů: aplikace/<app>/zak.html (každý s přístupem), <app>/lektor.html (lektor), <app>/testy/… (každý s přístupem) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('aplikace', 'aplikace', false, 52428800, array['text/html', 'application/pdf']) on conflict (id) do nothing;
create policy "aplikace: čtení podle přístupu" on storage.objects for select to authenticated using (
  bucket_id = 'aplikace' and (
    privat.je_spravce()
    or privat.role_v(split_part(name, '/', 1)) = 'lektor'
    or (privat.role_v(split_part(name, '/', 1)) is not null and (split_part(name, '/', 2) = 'zak.html' or split_part(name, '/', 2) = 'testy'))
  ));
create policy "aplikace: nahrává správce" on storage.objects for insert to authenticated with check (bucket_id = 'aplikace' and privat.je_spravce());
create policy "aplikace: přepisuje správce" on storage.objects for update to authenticated using (bucket_id = 'aplikace' and privat.je_spravce()) with check (bucket_id = 'aplikace' and privat.je_spravce());
create policy "aplikace: maže správce" on storage.objects for delete to authenticated using (bucket_id = 'aplikace' and privat.je_spravce());

-- ---------- výchozí aplikace ----------
insert into public.aplikace (id, nazev, popis) values
  ('matika', 'Matika po krocích', 'Lekce, testy, body a odměny'),
  ('hry', 'Hry', 'Lodě, Člověče, piškvorky – i s hosty přes kód');

-- ---------- údržba: mazání staré aktivity (až Tomáš potvrdí lhůtu, např. přes pg_cron) ----------
-- delete from public.aktivita where kdy < now() - interval '180 days';
