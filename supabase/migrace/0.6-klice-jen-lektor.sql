-- Učebna 0.6: klíče a vyplněné archy testů (aplikace/matika/klice/…) smí číst jen lektor aplikace a správce.
-- Ostatní soubory aplikace (matika.html, testy/… se zadáním) dál každý s přístupem; lektor.html dál jen lektor.
-- Použít až po OK Tomáše (změna na serveru). Ověření: žák nedostane matika/klice/…, lektor ano.
drop policy if exists "aplikace: čtení podle přístupu" on storage.objects;
create policy "aplikace: čtení podle přístupu" on storage.objects for select to authenticated using (
  bucket_id = 'aplikace' and (
    privat.je_spravce()
    or privat.role_v(split_part(name, '/', 1)) = 'lektor'
    or (privat.role_v(split_part(name, '/', 1)) is not null and split_part(name, '/', 2) not in ('lektor.html', 'klice'))
  ));
