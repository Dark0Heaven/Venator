-- Venator Werft: gemeinsamer Fortschritts-Speicher
--
-- Einmal im Supabase-Dashboard unter "SQL Editor" ausführen.
-- VORHER unten 'HIER-DEIN-PASSWORT' durch euer gemeinsames Passwort ersetzen
-- (mindestens 8 Zeichen, ihr beide braucht es später beim Eintragen).
--
-- Wer die Seite öffnet, darf lesen. Schreiben geht nur über die Funktionen
-- eintrag_hinzufuegen und meilenstein_setzen, und die prüfen das Passwort
-- auf dem Server.


-- 1. Tabelle für die Log-Einträge
create table if not exists public.eintraege (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  spieler    text not null check (char_length(spieler) between 1 and 40),
  prozent    smallint check (prozent between 0 and 100),
  notiz      text check (char_length(notiz) <= 280)
);

alter table public.eintraege enable row level security;

drop policy if exists "alle duerfen lesen" on public.eintraege;
create policy "alle duerfen lesen"
  on public.eintraege for select
  to anon, authenticated
  using (true);

-- Direktes Schreiben von außen sperren, nur Lesen bleibt
revoke all on public.eintraege from anon, authenticated;
grant select on public.eintraege to anon, authenticated;


-- 2. Passwort (nur als Hash gespeichert, von außen nicht lesbar)
create table if not exists public.venator_geheim (
  id      int primary key default 1 check (id = 1),
  pw_hash text not null
);

alter table public.venator_geheim enable row level security;
revoke all on public.venator_geheim from anon, authenticated;

insert into public.venator_geheim (id, pw_hash)
values (1, encode(sha256(convert_to('venator:' || 'HIER-DEIN-PASSWORT', 'UTF8')), 'hex'))
on conflict (id) do update set pw_hash = excluded.pw_hash;


-- 3. Funktion zum Eintragen, prüft das Passwort
create or replace function public.eintrag_hinzufuegen(
  p_pin     text,
  p_spieler text,
  p_prozent int,
  p_notiz   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spieler text := trim(coalesce(p_spieler, ''));
  v_notiz   text := trim(coalesce(p_notiz, ''));
begin
  if not exists (
    select 1
    from public.venator_geheim
    where pw_hash = encode(sha256(convert_to('venator:' || coalesce(p_pin, ''), 'UTF8')), 'hex')
  ) then
    raise exception 'pin_falsch';
  end if;

  if v_spieler = '' or char_length(v_spieler) > 40 then
    raise exception 'spieler_ungueltig';
  end if;
  if p_prozent is not null and (p_prozent < 0 or p_prozent > 100) then
    raise exception 'prozent_ungueltig';
  end if;
  if char_length(v_notiz) > 280 then
    raise exception 'notiz_zu_lang';
  end if;
  if p_prozent is null and v_notiz = '' then
    raise exception 'eintrag_leer';
  end if;

  insert into public.eintraege (spieler, prozent, notiz)
  values (v_spieler, p_prozent, nullif(v_notiz, ''));
end;
$$;

revoke all on function public.eintrag_hinzufuegen(text, text, int, text) from public;
grant execute on function public.eintrag_hinzufuegen(text, text, int, text) to anon, authenticated;

-- 4. Meilensteine: gemeinsamer Stand (erledigt oder offen), daraus berechnet
--    die Seite den Baufortschritt. Schreiben geht nur über die Funktion
--    meilenstein_setzen, die ebenfalls das Passwort prüft.
create table if not exists public.meilensteine (
  schluessel text primary key check (char_length(schluessel) between 1 and 60),
  fertig     boolean not null default false,
  von        text check (char_length(von) <= 40),
  geaendert  timestamptz not null default now()
);

alter table public.meilensteine enable row level security;

drop policy if exists "alle duerfen lesen" on public.meilensteine;
create policy "alle duerfen lesen"
  on public.meilensteine for select
  to anon, authenticated
  using (true);

revoke all on public.meilensteine from anon, authenticated;
grant select on public.meilensteine to anon, authenticated;

create or replace function public.meilenstein_setzen(
  p_pin        text,
  p_schluessel text,
  p_fertig     boolean,
  p_spieler    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schluessel text := trim(coalesce(p_schluessel, ''));
  v_spieler    text := trim(coalesce(p_spieler, ''));
begin
  if not exists (
    select 1
    from public.venator_geheim
    where pw_hash = encode(sha256(convert_to('venator:' || coalesce(p_pin, ''), 'UTF8')), 'hex')
  ) then
    raise exception 'pin_falsch';
  end if;

  if v_spieler = '' or char_length(v_spieler) > 40 then
    raise exception 'spieler_ungueltig';
  end if;
  if v_schluessel = '' or char_length(v_schluessel) > 60 then
    raise exception 'meilenstein_ungueltig';
  end if;
  if p_fertig is null then
    raise exception 'meilenstein_ungueltig';
  end if;

  insert into public.meilensteine (schluessel, fertig, von, geaendert)
  values (v_schluessel, p_fertig, v_spieler, now())
  on conflict (schluessel) do update
    set fertig = excluded.fertig, von = excluded.von, geaendert = excluded.geaendert;
end;
$$;

revoke all on function public.meilenstein_setzen(text, text, boolean, text) from public;
grant execute on function public.meilenstein_setzen(text, text, boolean, text) to anon, authenticated;

-- Supabase die neuen Funktionen sofort bekannt machen
notify pgrst, 'reload schema';
