-- Učebna 0.8.12: host (role host) smí z úložiště číst jen prázdné testy (aplikace/<app>/testy/…) a verzi pro hosty (host.html).
-- Plnou Matiku (matika.html, zak.html), klíče a vyplněné archy (klice/…) ani lektor.html nedostane. Žák a lektor beze změny.
-- Pojistka navíc: dnes v úložišti žádná plná Matika neleží (11. 11.), klíče a lektor.html host nedostane už teď.
-- Použít až po OK Tomáše (změna pravidel na serveru – nástroj chce potvrzení). Ověření: host dostane testy/…, matika.html ne.
drop policy if exists "aplikace: čtení podle přístupu" on storage.objects;
create policy "aplikace: čtení podle přístupu" on storage.objects for select to authenticated using (
  bucket_id = 'aplikace' and (
    privat.je_spravce()
    or privat.role_v(split_part(name, '/', 1)) = 'lektor'
    or (privat.role_v(split_part(name, '/', 1)) = 'host' and split_part(name, '/', 2) in ('testy', 'host.html'))
    or (privat.role_v(split_part(name, '/', 1)) = 'zak' and split_part(name, '/', 2) not in ('lektor.html', 'klice'))
  ));
