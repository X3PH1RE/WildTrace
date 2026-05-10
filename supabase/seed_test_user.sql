-- =====================================================================
-- WildTrace mobile: seed a confirmed test user (FIXED).
-- =====================================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query →
-- paste → Run). Idempotent: safe to re-run.
--
-- It will:
--   * create the user if missing, OR
--   * repair an existing test user whose NULL token/flag columns make
--     Supabase Auth throw "Database error querying schema" on sign-in.
--
-- Test credentials (used by the mobile sign-in screen):
--   email:    test@wildtrace.app
--   password: wildtrace123
-- =====================================================================

create extension if not exists pgcrypto;

do $$
declare
  v_email    text := 'test@wildtrace.app';
  v_password text := 'wildtrace123';
  v_user_id  uuid;
begin
  -- Look up an existing test user.
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    -- Fresh insert with every column GoTrue expects to be non-null.
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_change,
      phone_change_token,
      email_change_token_current,
      email_change_confirm_status,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      null,
      '',
      null,
      '',
      null,
      '',
      '',
      null,
      null,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false,
      now(),
      now(),
      null,
      '',
      '',
      '',
      0,
      '',
      null,
      false,
      false
    );

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      v_user_id::text,
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true
      ),
      'email',
      now(),
      now(),
      now()
    );
  else
    -- Repair: ensure password matches and tokens/flags are non-null.
    update auth.users
       set encrypted_password         = crypt(v_password, gen_salt('bf')),
           email_confirmed_at         = coalesce(email_confirmed_at, now()),
           confirmation_token         = coalesce(confirmation_token, ''),
           recovery_token             = coalesce(recovery_token, ''),
           email_change_token_new     = coalesce(email_change_token_new, ''),
           email_change_token_current = coalesce(email_change_token_current, ''),
           email_change               = coalesce(email_change, ''),
           phone_change               = coalesce(phone_change, ''),
           phone_change_token         = coalesce(phone_change_token, ''),
           reauthentication_token     = coalesce(reauthentication_token, ''),
           email_change_confirm_status = coalesce(email_change_confirm_status, 0),
           is_sso_user                = coalesce(is_sso_user, false),
           is_anonymous               = coalesce(is_anonymous, false),
           is_super_admin             = coalesce(is_super_admin, false),
           aud                        = coalesce(aud, 'authenticated'),
           role                       = coalesce(role, 'authenticated'),
           raw_app_meta_data          = coalesce(
             raw_app_meta_data,
             '{"provider":"email","providers":["email"]}'::jsonb
           ),
           raw_user_meta_data         = coalesce(raw_user_meta_data, '{}'::jsonb),
           updated_at                 = now()
     where id = v_user_id;

    -- Ensure a matching identity row exists.
    if not exists (
      select 1
        from auth.identities
       where user_id = v_user_id and provider = 'email'
    ) then
      insert into auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        v_user_id::text,
        v_user_id,
        jsonb_build_object(
          'sub', v_user_id::text,
          'email', v_email,
          'email_verified', true
        ),
        'email',
        now(),
        now(),
        now()
      );
    end if;
  end if;

  -- Mirror profile row in public.users (FK target for sightings).
  insert into public.users (id, username, xp, level, streak)
  values (v_user_id, 'Test Explorer', 0, 1, 0)
  on conflict (id) do nothing;

  raise notice 'Test user ready: % (id %)', v_email, v_user_id;
end $$;
