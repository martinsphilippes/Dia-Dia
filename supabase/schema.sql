-- ============================================================================
-- MatchPoint — schema do banco (Supabase / PostgreSQL)
-- Este arquivo documenta a estrutura já aplicada no projeto Supabase.
-- Para recriar do zero, rode em ordem no SQL Editor do Supabase.
-- ============================================================================

-- ---------- Enums ----------
create type skill_level    as enum ('iniciante', 'intermediario', 'avancado', 'competitivo');
create type play_format    as enum ('simples', 'duplas', 'ambos');
create type dominant_hand  as enum ('destro', 'canhoto');
create type swipe_direction as enum ('like', 'pass');

-- ---------- Tabela: profiles ----------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  birthdate     date,
  gender        text,
  city          text not null,
  state         text,
  country       text default 'Brasil',
  bio           text,
  skill_level   skill_level not null default 'iniciante',
  dominant_hand dominant_hand,
  play_format   play_format not null default 'ambos',
  availability  text[] default '{}',
  avatar_url    text,
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_city_idx on public.profiles (lower(city));

-- ---------- Tabela: swipes ----------
create table public.swipes (
  id         uuid primary key default gen_random_uuid(),
  swiper_id  uuid not null references public.profiles(id) on delete cascade,
  swiped_id  uuid not null references public.profiles(id) on delete cascade,
  direction  swipe_direction not null,
  created_at timestamptz not null default now(),
  check (swiper_id <> swiped_id),
  unique (swiper_id, swiped_id)
);
create index swipes_swiped_idx on public.swipes (swiped_id);

-- ---------- Tabela: matches ----------
-- Convenção: player_a_id < player_b_id (garante par único independente da ordem)
create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  player_a_id  uuid not null references public.profiles(id) on delete cascade,
  player_b_id  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  check (player_a_id < player_b_id),
  unique (player_a_id, player_b_id)
);
create index matches_player_a_idx on public.matches (player_a_id);
create index matches_player_b_idx on public.matches (player_b_id);

-- ---------- Tabela: messages ----------
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_match_idx on public.messages (match_id, created_at);

-- ============================================================================
-- Funções e triggers
-- ============================================================================

-- Cria a linha em profiles automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.profiles (id, name, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'city', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém updated_at atualizado
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o match quando há "like" recíproco
create or replace function public.handle_swipe_match()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  reciprocal_exists boolean;
  a uuid;
  b uuid;
begin
  if new.direction <> 'like' then
    return new;
  end if;

  select exists(
    select 1 from public.swipes s
    where s.swiper_id = new.swiped_id
      and s.swiped_id = new.swiper_id
      and s.direction = 'like'
  ) into reciprocal_exists;

  if reciprocal_exists then
    if new.swiper_id < new.swiped_id then
      a := new.swiper_id; b := new.swiped_id;
    else
      a := new.swiped_id; b := new.swiper_id;
    end if;
    insert into public.matches (player_a_id, player_b_id)
    values (a, b)
    on conflict (player_a_id, player_b_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger swipes_handle_match
  after insert on public.swipes
  for each row execute function public.handle_swipe_match();

-- ============================================================================
-- Funções RPC usadas pelo app
-- ============================================================================

-- Perfis para descoberta: mesma cidade, ainda não avaliados, exceto o próprio
create or replace function public.get_discovery_profiles(
  p_limit integer default 20,
  p_format play_format default null,
  p_skill skill_level default null
)
returns setof public.profiles
language sql stable security definer set search_path to 'public' as $$
  select p.*
  from public.profiles p
  join public.profiles me on me.id = auth.uid()
  where p.id <> auth.uid()
    and p.onboarded = true
    and lower(p.city) = lower(me.city)
    and (p_format is null or p.play_format = p_format or p.play_format = 'ambos')
    and (p_skill is null or p.skill_level = p_skill)
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = auth.uid() and s.swiped_id = p.id
    )
  order by random()
  limit greatest(1, least(p_limit, 50));
$$;

-- Matches do usuário com última mensagem e não-lidas
create or replace function public.get_my_matches()
returns table (
  match_id uuid, matched_at timestamptz, other_id uuid, other_name text,
  other_city text, other_avatar_url text, other_skill skill_level,
  last_message text, last_message_at timestamptz, unread_count bigint
)
language sql stable security definer set search_path to 'public' as $$
  select
    m.id, m.created_at,
    other.id, other.name, other.city, other.avatar_url, other.skill_level,
    lm.content, lm.created_at,
    coalesce(uc.cnt, 0)
  from public.matches m
  join public.profiles other
    on other.id = case when m.player_a_id = auth.uid() then m.player_b_id else m.player_a_id end
  left join lateral (
    select content, created_at from public.messages
    where match_id = m.id order by created_at desc limit 1
  ) lm on true
  left join lateral (
    select count(*) as cnt from public.messages
    where match_id = m.id and sender_id <> auth.uid() and read = false
  ) uc on true
  where m.player_a_id = auth.uid() or m.player_b_id = auth.uid()
  order by coalesce(lm.created_at, m.created_at) desc;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.swipes   enable row level security;
alter table public.matches  enable row level security;
alter table public.messages enable row level security;

-- profiles
create policy profiles_select_authenticated on public.profiles
  for select to authenticated using (true);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- swipes
create policy swipes_select_own on public.swipes
  for select to authenticated using (auth.uid() = swiper_id);
create policy swipes_insert_own on public.swipes
  for insert to authenticated with check (auth.uid() = swiper_id);

-- matches
create policy matches_select_participant on public.matches
  for select to authenticated
  using (auth.uid() = player_a_id or auth.uid() = player_b_id);

-- messages
create policy messages_select_participant on public.messages
  for select to authenticated using (
    exists (select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.player_a_id or auth.uid() = m.player_b_id)));
create policy messages_insert_participant on public.messages
  for insert to authenticated with check (
    auth.uid() = sender_id and exists (select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.player_a_id or auth.uid() = m.player_b_id)));
create policy messages_update_read on public.messages
  for update to authenticated using (
    exists (select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.player_a_id or auth.uid() = m.player_b_id)));

-- Realtime para o chat
alter publication supabase_realtime add table public.messages;

-- ============================================================================
-- Storage: bucket público de avatares
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
