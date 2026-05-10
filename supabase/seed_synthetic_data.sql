-- =====================================================================
-- WildTrace: synthetic dashboard data
-- =====================================================================
-- Run AFTER seed_test_user.sql in the Supabase SQL Editor.
-- Idempotent: re-running first wipes only the rows this script created.
--
-- It populates:
--   * 12 species (real Indian biodiversity, mix of rarity / invasives)
--   * The test user as the top contributor
--   * 3 decoy auth.users + matching public.users for a real leaderboard
--   * ~80 sightings across protected areas (Bandipur, Nagarhole, Western
--     Ghats, Sundarbans, Kaziranga, BNHS Mumbai) over the last 90 days
--   * 6 individuals (re-ID candidates) tied to large mammals
--   * 6 expert_reviews on a subset of sightings
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Species catalogue (upsert by scientific_name)
-- ---------------------------------------------------------------------
insert into public.species (
  common_name, scientific_name, rarity_tier, conservation_status,
  is_invasive, ecological_role, description
) values
  ('Bengal Tiger',          'Panthera tigris tigris', 'Legendary', 'Endangered',          false, 'Apex predator',                    'Largest cat species; keystone predator of Indian forests.'),
  ('Asian Elephant',        'Elephas maximus',        'Epic',      'Endangered',          false, 'Seed disperser, ecosystem engineer','Large herbivorous mammal; megafauna of the subcontinent.'),
  ('Indian Leopard',        'Panthera pardus fusca',  'Rare',      'Vulnerable',          false, 'Apex predator (mid-tier)',         'Highly adaptable big cat across Indian landscapes.'),
  ('Sloth Bear',            'Melursus ursinus',       'Rare',      'Vulnerable',          false, 'Insectivore, fruit disperser',     'Shaggy bear endemic to the Indian subcontinent.'),
  ('Indian Peafowl',        'Pavo cristatus',         'Common',    'Least Concern',       false, 'Granivore, insectivore',           'National bird of India; unmistakable iridescent plumage.'),
  ('Hornbill',              'Buceros bicornis',       'Rare',      'Vulnerable',          false, 'Long-distance seed disperser',     'Great Indian Hornbill; flagship Western Ghats species.'),
  ('Indian Rock Python',    'Python molurus',         'Uncommon',  'Near Threatened',     false, 'Apex reptilian predator',          'Large constrictor across forests and wetlands.'),
  ('Spotted Deer',          'Axis axis',              'Common',    'Least Concern',       false, 'Primary prey species',             'Chital; abundant grazer in Indian forests.'),
  ('Lantana',               'Lantana camara',         'Common',    'Least Concern',       true,  'Invasive understory weed',         'Aggressive invasive shrub displacing native flora.'),
  ('Water Hyacinth',        'Pontederia crassipes',   'Common',    'Least Concern',       true,  'Invasive aquatic mat-former',      'Chokes wetlands; reduces oxygen and native biodiversity.'),
  ('African Catfish',       'Clarias gariepinus',     'Uncommon',  'Least Concern',       true,  'Invasive freshwater predator',     'Illegally farmed; outcompetes native fish in Indian rivers.'),
  ('Giant Wood Spider',     'Nephila pilipes',        'Uncommon',  'Least Concern',       false, 'Insect population control',        'Large orb-weaver; common across Western Ghats.')
on conflict (scientific_name) do update set
  common_name         = excluded.common_name,
  rarity_tier         = excluded.rarity_tier,
  conservation_status = excluded.conservation_status,
  is_invasive         = excluded.is_invasive,
  ecological_role     = excluded.ecological_role,
  description         = excluded.description;

-- ---------------------------------------------------------------------
-- 2. Resolve / create users
-- ---------------------------------------------------------------------
do $$
declare
  v_test_email   text := 'test@wildtrace.app';
  v_test_id      uuid;

  -- Decoy contributors. Random uuids reused on every run via stable lookup by email.
  v_decoys       text[] := array[
    'priya.naturalist@wildtrace.app',
    'arjun.field@wildtrace.app',
    'ananya.scout@wildtrace.app'
  ];
  v_decoy_names  text[] := array[
    'Priya N.',
    'Arjun F.',
    'Ananya S.'
  ];
  v_decoy_xp     int[]  := array[1750, 980, 540];
  v_decoy_lvl    int[]  := array[4, 2, 2];
  v_decoy_email  text;
  v_decoy_id     uuid;
  i              int;

  -- Species ids
  v_tiger_id     uuid;
  v_elephant_id  uuid;
  v_leopard_id   uuid;
  v_bear_id      uuid;
  v_peafowl_id   uuid;
  v_hornbill_id  uuid;
  v_python_id    uuid;
  v_deer_id      uuid;
  v_lantana_id   uuid;
  v_hyacinth_id  uuid;
  v_catfish_id   uuid;
  v_spider_id    uuid;

  v_species_ids  uuid[];
  v_user_ids     uuid[];

  -- Hotspot anchors: lat, lng, label
  v_hot_lat      double precision[] := array[
    11.6700,  -- Bandipur National Park
    11.9500,  -- Nagarhole
    10.3300,  -- Periyar (Western Ghats)
    21.9300,  -- Sundarbans (rough centre)
    26.6500,  -- Kaziranga
    19.0700   -- Mumbai BNHS / urban
  ];
  v_hot_lng      double precision[] := array[
    76.6300,
    76.1000,
    77.1500,
    88.7300,
    93.4000,
    72.8800
  ];

  v_lat          double precision;
  v_lng          double precision;
  v_anchor       int;
  v_user_idx     int;
  v_species_idx  int;
  v_sighting_id  uuid;
  v_random       double precision;
  v_inserted     int := 0;
  v_review_count int := 0;
begin
  ----------------------------------------------------------------------
  -- 2a. Test user must already exist (created by seed_test_user.sql)
  ----------------------------------------------------------------------
  select id into v_test_id from auth.users where email = v_test_email;
  if v_test_id is null then
    raise exception 'Test user % not found. Run supabase/seed_test_user.sql first.', v_test_email;
  end if;

  ----------------------------------------------------------------------
  -- 2b. Decoy contributors (idempotent: lookup by email, create if missing)
  ----------------------------------------------------------------------
  v_user_ids := array[v_test_id];

  for i in 1..array_length(v_decoys, 1) loop
    v_decoy_email := v_decoys[i];
    select id into v_decoy_id from auth.users where email = v_decoy_email;

    if v_decoy_id is null then
      v_decoy_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, confirmation_token, recovery_token,
        email_change_token_new, email_change, email_change_token_current,
        phone_change, phone_change_token, reauthentication_token,
        email_change_confirm_status, is_sso_user, is_anonymous, is_super_admin,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000', v_decoy_id,
        'authenticated', 'authenticated', v_decoy_email,
        crypt('seedonly-' || v_decoy_email, gen_salt('bf')),
        now(), '', '', '', '', '', '', '', '',
        0, false, false, false,
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb, now(), now()
      );

      insert into auth.identities (
        provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        v_decoy_id::text, v_decoy_id,
        jsonb_build_object('sub', v_decoy_id::text, 'email', v_decoy_email, 'email_verified', true),
        'email', now(), now(), now()
      );
    end if;

    insert into public.users (id, username, xp, level, streak)
    values (v_decoy_id, v_decoy_names[i], v_decoy_xp[i], v_decoy_lvl[i], (v_decoy_xp[i] / 200))
    on conflict (id) do update set
      username = excluded.username,
      xp       = excluded.xp,
      level    = excluded.level,
      streak   = excluded.streak;

    v_user_ids := array_append(v_user_ids, v_decoy_id);
  end loop;

  -- Boost the test user to be #1 on the leaderboard.
  update public.users
     set username = coalesce(username, 'Test Explorer'),
         xp      = 2400,
         level   = 5,
         streak  = 12
   where id = v_test_id;

  ----------------------------------------------------------------------
  -- 3. Pull species ids
  ----------------------------------------------------------------------
  select id into v_tiger_id    from public.species where scientific_name = 'Panthera tigris tigris';
  select id into v_elephant_id from public.species where scientific_name = 'Elephas maximus';
  select id into v_leopard_id  from public.species where scientific_name = 'Panthera pardus fusca';
  select id into v_bear_id     from public.species where scientific_name = 'Melursus ursinus';
  select id into v_peafowl_id  from public.species where scientific_name = 'Pavo cristatus';
  select id into v_hornbill_id from public.species where scientific_name = 'Buceros bicornis';
  select id into v_python_id   from public.species where scientific_name = 'Python molurus';
  select id into v_deer_id     from public.species where scientific_name = 'Axis axis';
  select id into v_lantana_id  from public.species where scientific_name = 'Lantana camara';
  select id into v_hyacinth_id from public.species where scientific_name = 'Pontederia crassipes';
  select id into v_catfish_id  from public.species where scientific_name = 'Clarias gariepinus';
  select id into v_spider_id   from public.species where scientific_name = 'Nephila pilipes';

  v_species_ids := array[
    v_tiger_id, v_elephant_id, v_leopard_id, v_bear_id, v_peafowl_id, v_hornbill_id,
    v_python_id, v_deer_id, v_lantana_id, v_hyacinth_id, v_catfish_id, v_spider_id
  ];

  ----------------------------------------------------------------------
  -- 4. Wipe prior synthetic sightings & reviews for these users (idempotent)
  ----------------------------------------------------------------------
  delete from public.expert_reviews
   where sighting_id in (
     select id from public.sightings where user_id = any(v_user_ids)
   );

  delete from public.sightings where user_id = any(v_user_ids);

  ----------------------------------------------------------------------
  -- 5. Generate sightings
  ----------------------------------------------------------------------
  for i in 1..80 loop
    -- Distribution: test user gets ~half of sightings (richest data).
    v_random := random();
    if v_random < 0.55 then
      v_user_idx := 1;                                      -- test user
    else
      v_user_idx := 2 + floor(random() * 3)::int;           -- one of the decoys (idx 2..4)
    end if;

    -- Species: weight towards charismatic megafauna for the test user, mix for others.
    if v_user_idx = 1 and random() < 0.6 then
      v_species_idx := 1 + floor(random() * 6)::int;        -- tiger/elephant/leopard/bear/peafowl/hornbill
    else
      v_species_idx := 1 + floor(random() * array_length(v_species_ids, 1))::int;
    end if;

    -- Hotspot anchor with ±0.4° jitter (~40 km box)
    v_anchor := 1 + floor(random() * array_length(v_hot_lat, 1))::int;
    v_lat    := v_hot_lat[v_anchor] + (random() - 0.5) * 0.8;
    v_lng    := v_hot_lng[v_anchor] + (random() - 0.5) * 0.8;

    v_sighting_id := gen_random_uuid();

    insert into public.sightings (
      id, user_id, species_id, image_url,
      latitude, longitude, timestamp,
      confidence, is_verified, created_at
    ) values (
      v_sighting_id,
      v_user_ids[v_user_idx],
      v_species_ids[v_species_idx],
      'https://placehold.co/600x400/1f2937/9ca3af?text=Sighting+' || i,
      v_lat,
      v_lng,
      now() - (interval '1 day' * floor(random() * 90)) - (interval '1 hour' * floor(random() * 24)),
      round((0.55 + random() * 0.44)::numeric, 3),
      random() < 0.25,
      now() - (interval '1 day' * floor(random() * 90))
    );

    -- Add an expert review for ~7-8% of sightings.
    if random() < 0.08 and v_review_count < 6 then
      insert into public.expert_reviews (
        sighting_id, reviewer_id, status, notes
      ) values (
        v_sighting_id,
        v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int],
        case
          when random() < 0.55 then 'approved'
          when random() < 0.85 then 'pending'
          else 'rejected'
        end,
        case
          when random() < 0.5 then 'Confirmed via field marks.'
          else 'Awaiting second reviewer.'
        end
      );
      v_review_count := v_review_count + 1;
    end if;

    v_inserted := v_inserted + 1;
  end loop;

  ----------------------------------------------------------------------
  -- 6. Individuals (re-ID anchors): wipe + insert for our species set
  ----------------------------------------------------------------------
  delete from public.individuals
   where species_id = any(v_species_ids);

  insert into public.individuals (species_id, embedding_reference, last_seen, known_locations) values
    (v_tiger_id,    'tiger-bandipur-001', now() - interval '4 days',
       jsonb_build_array(jsonb_build_object('lat', 11.67, 'lng', 76.63, 'label', 'Bandipur Zone B'))),
    (v_tiger_id,    'tiger-nagarhole-014', now() - interval '12 days',
       jsonb_build_array(jsonb_build_object('lat', 11.95, 'lng', 76.10, 'label', 'Nagarhole Core'))),
    (v_elephant_id, 'elephant-bandipur-007', now() - interval '2 days',
       jsonb_build_array(jsonb_build_object('lat', 11.69, 'lng', 76.61, 'label', 'Bandipur Watershed'))),
    (v_leopard_id,  'leopard-mumbai-031', now() - interval '6 days',
       jsonb_build_array(jsonb_build_object('lat', 19.07, 'lng', 72.88, 'label', 'Sanjay Gandhi NP'))),
    (v_bear_id,     'sloth-bear-periyar-002', now() - interval '20 days',
       jsonb_build_array(jsonb_build_object('lat', 10.33, 'lng', 77.15, 'label', 'Periyar Buffer'))),
    (v_hornbill_id, 'hornbill-westernghats-009', now() - interval '8 days',
       jsonb_build_array(jsonb_build_object('lat', 10.34, 'lng', 77.16, 'label', 'Periyar Canopy')));

  raise notice 'Synthetic data ready: % sightings, % expert reviews, % users tied in.',
    v_inserted, v_review_count, array_length(v_user_ids, 1);
end $$;
