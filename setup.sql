-- =====================================================================
-- Kulsums Collection: database setup
-- Paste all of this into Supabase > SQL Editor > New query, then select Run.
-- It is safe to run again; it will not delete your data.
-- =====================================================================

-- ---------- tables ----------
create table if not exists public.kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id         text primary key,
  phone      text not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role    text not null check (role in ('admin','employee')),
  email   text
);

-- Who is the signed-in person? Returns 'admin', 'employee', or null for customers.
create or replace function public.staff_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.staff where user_id = auth.uid()
$$;

alter table public.kv     enable row level security;
alter table public.orders enable row level security;
alter table public.staff  enable row level security;

-- ---------- store data (kv) ----------
-- Customers can read only the customer-safe rows. Vendor prices, vendors, and
-- unpublished products live in private rows that only staff can read.
drop policy if exists kv_read on public.kv;
create policy kv_read on public.kv for select using (
  key in ('kc:settings','kc:categories','kc:catalog','kc:vcatalog')
  or public.staff_role() is not null
);

-- Admins can change everything. Employees can change products, vendors, and videos.
drop policy if exists kv_insert on public.kv;
create policy kv_insert on public.kv for insert with check (
  public.staff_role() = 'admin'
  or (public.staff_role() = 'employee' and key in ('kc:products','kc:vendors','kc:videos','kc:catalog','kc:vcatalog','kc:resellers'))
);
drop policy if exists kv_update on public.kv;
create policy kv_update on public.kv for update
  using (public.staff_role() is not null)
  with check (
    public.staff_role() = 'admin'
    or (public.staff_role() = 'employee' and key in ('kc:products','kc:vendors','kc:videos','kc:catalog','kc:vcatalog','kc:resellers'))
  );
drop policy if exists kv_delete on public.kv;
create policy kv_delete on public.kv for delete using (public.staff_role() = 'admin');

-- ---------- orders ----------
-- Anyone can place an order, but only as a new, unpaid order.
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert with check (
  id ~ '^KC-[A-Z0-9]{5,10}$'
  and length(phone) between 10 and 15
  and data->>'status' = 'placed'
  and data->'payment'->>'status' in ('pending','cod')
);
-- Only staff can see or update orders.
drop policy if exists orders_staff_read on public.orders;
create policy orders_staff_read on public.orders for select using (public.staff_role() is not null);
drop policy if exists orders_staff_update on public.orders;
create policy orders_staff_update on public.orders for update using (public.staff_role() is not null) with check (public.staff_role() is not null);
drop policy if exists orders_admin_delete on public.orders;
create policy orders_admin_delete on public.orders for delete using (public.staff_role() = 'admin');

-- Customers track an order with its number AND the phone used at checkout.
-- Returns only status details, never the address.
create or replace function public.track_order(p_id text, p_phone text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', id,
    'status', data->>'status',
    'history', coalesce(data->'history','[]'::jsonb),
    'payment', jsonb_build_object('method', data->'payment'->>'method', 'status', data->'payment'->>'status'),
    'tracking', coalesce(data->>'tracking',''),
    'total', (data->>'total')::numeric,
    'items', coalesce(data->'items','[]'::jsonb),
    'sub', (data->>'sub')::numeric, 'comboDisc', coalesce((data->>'comboDisc')::numeric,0), 'combos', coalesce(data->'combos','[]'::jsonb),
    'disc', coalesce((data->>'disc')::numeric,0), 'coupon', coalesce(data->>'coupon',''), 'ship', coalesce((data->>'ship')::numeric,0), 'cod', coalesce((data->>'cod')::numeric,0),
    'createdAt', (data->>'createdAt')::bigint)
  from public.orders
  where id = upper(p_id)
    and right(regexp_replace(phone,'\D','','g'),10) = right(regexp_replace(p_phone,'\D','','g'),10)
$$;

-- Customers send their UPI or bank reference for an unpaid order.
create or replace function public.submit_payment_ref(p_id text, p_phone text, p_ref text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.orders
     set data = jsonb_set(jsonb_set(data,'{payment,ref}',to_jsonb(left(p_ref,40))),'{payment,status}','"submitted"')
   where id = upper(p_id)
     and right(regexp_replace(phone,'\D','','g'),10) = right(regexp_replace(p_phone,'\D','','g'),10)
     and data->'payment'->>'status' = 'pending';
  return found;
end $$;

grant execute on function public.track_order(text,text) to anon, authenticated;
grant execute on function public.submit_payment_ref(text,text,text) to anon, authenticated;

-- ---------- staff ----------
drop policy if exists staff_read on public.staff;
create policy staff_read on public.staff for select using (user_id = auth.uid() or public.staff_role() = 'admin');

-- ---------- photo and video storage ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do update set public = true;

drop policy if exists media_staff_read   on storage.objects;
drop policy if exists media_staff_insert on storage.objects;
drop policy if exists media_staff_update on storage.objects;
drop policy if exists media_staff_delete on storage.objects;
create policy media_staff_read   on storage.objects for select using (bucket_id = 'media' and public.staff_role() is not null);
create policy media_staff_insert on storage.objects for insert with check (bucket_id = 'media' and public.staff_role() is not null);
create policy media_staff_update on storage.objects for update using (bucket_id = 'media' and public.staff_role() is not null);
create policy media_staff_delete on storage.objects for delete using (bucket_id = 'media' and public.staff_role() is not null);

-- ---------- staff accounts managed from the website ----------
-- Admins add people by email in Settings > Staff accounts.
-- If the person already has a login, they get access at once.
-- If not, their email waits here until they create an account on the Staff login page.
create table if not exists public.staff_invites (
  email      text primary key,
  role       text not null check (role in ('admin','employee')),
  created_at timestamptz not null default now()
);
alter table public.staff_invites enable row level security;
-- (No policies on purpose: only the functions below can read or change it.)

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.staff (user_id, role, email)
  select new.id, i.role, lower(new.email) from public.staff_invites i where i.email = lower(new.email)
  on conflict (user_id) do nothing;
  delete from public.staff_invites where email = lower(new.email);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.list_staff() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if public.staff_role() is distinct from 'admin' then raise exception 'Only admins can see staff accounts'; end if;
  return jsonb_build_object(
    'staff', coalesce((select jsonb_agg(jsonb_build_object(
        'email', lower(u.email), 'role', s.role, 'me', s.user_id = auth.uid(),
        'lastSignIn', u.last_sign_in_at, 'confirmed', u.email_confirmed_at is not null)
        order by s.role, u.email)
      from public.staff s join auth.users u on u.id = s.user_id), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('email', email, 'role', role, 'createdAt', created_at) order by created_at)
      from public.staff_invites), '[]'::jsonb));
end $$;

create or replace function public.invite_staff(p_email text, p_role text) returns text
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email)); v_uid uuid;
begin
  if public.staff_role() is distinct from 'admin' then raise exception 'Only admins can add staff'; end if;
  if p_role not in ('admin','employee') then raise exception 'Role must be admin or employee'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'That email address does not look right'; end if;
  select id into v_uid from auth.users where lower(email) = v_email;
  if v_uid is not null then
    if v_uid = auth.uid() and p_role <> 'admin' then raise exception 'You cannot remove your own admin access'; end if;
    insert into public.staff (user_id, role, email) values (v_uid, p_role, v_email)
      on conflict (user_id) do update set role = excluded.role, email = excluded.email;
    delete from public.staff_invites where email = v_email;
    return 'added';
  end if;
  insert into public.staff_invites (email, role) values (v_email, p_role)
    on conflict (email) do update set role = excluded.role;
  return 'invited';
end $$;

create or replace function public.remove_staff(p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email)); v_uid uuid; v_role text;
begin
  if public.staff_role() is distinct from 'admin' then raise exception 'Only admins can remove staff'; end if;
  delete from public.staff_invites where email = v_email;
  select s.user_id, s.role into v_uid, v_role
    from public.staff s join auth.users u on u.id = s.user_id where lower(u.email) = v_email;
  if v_uid is null then return 'removed'; end if;
  if v_uid = auth.uid() then raise exception 'You cannot remove yourself'; end if;
  if v_role = 'admin' and (select count(*) from public.staff where role = 'admin') <= 1 then raise exception 'Keep at least one admin'; end if;
  delete from public.staff where user_id = v_uid;
  return 'removed';
end $$;

revoke execute on function public.list_staff() from public, anon;
revoke execute on function public.invite_staff(text,text) from public, anon;
revoke execute on function public.remove_staff(text) from public, anon;
grant execute on function public.list_staff() to authenticated;
grant execute on function public.invite_staff(text,text) to authenticated;
grant execute on function public.remove_staff(text) to authenticated;

-- ---------- customer reviews and stories ----------
-- Customers can only add posts through submit_post(), which always saves them as 'pending'.
-- The public can read approved posts only. Admins approve, hide, reply, and delete.
create table if not exists public.posts (
  id            text primary key default ('P-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12))),
  type          text not null check (type in ('review','story')),
  product_id    text,
  product_title text check (length(product_title) <= 120),
  name          text not null check (length(name) between 1 and 60),
  city          text check (length(city) <= 60),
  rating        int  check (rating between 1 and 5),
  recommend     boolean,
  title         text check (length(title) <= 120),
  body          text not null check (length(body) between 10 and 3000),
  photo         text check (photo is null or length(photo) < 400000),
  verified      boolean not null default false,
  status        text not null default 'pending' check (status in ('pending','approved','hidden')),
  featured      boolean not null default false,
  reply         text check (length(reply) <= 2000),
  created_at    timestamptz not null default now()
);
alter table public.posts enable row level security;
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (status = 'approved' or public.staff_role() = 'admin');
drop policy if exists posts_admin_update on public.posts;
create policy posts_admin_update on public.posts for update using (public.staff_role() = 'admin') with check (public.staff_role() = 'admin');
drop policy if exists posts_admin_delete on public.posts;
create policy posts_admin_delete on public.posts for delete using (public.staff_role() = 'admin');

create or replace function public.submit_post(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_id text; v_verified boolean := false; v_type text := p->>'type'; v_require boolean;
begin
  if v_type not in ('review','story') then raise exception 'Unknown post type'; end if;
  if coalesce(length(trim(p->>'name')),0) < 1 then raise exception 'Please enter your name'; end if;
  if coalesce(length(trim(p->>'body')),0) < 10 then raise exception 'Please write a little more, at least a sentence'; end if;
  if v_type = 'review' and coalesce(p->>'rating','') !~ '^[1-5]$' then raise exception 'Please choose a star rating'; end if;
  if coalesce(p->>'orderId','') <> '' and coalesce(p->>'phone','') <> '' then
    select true into v_verified from public.orders
     where id = upper(p->>'orderId')
       and right(regexp_replace(phone,'\D','','g'),10) = right(regexp_replace(p->>'phone','\D','','g'),10);
  end if;
  select coalesce((value->'community'->>'requireOrder')::boolean, false) into v_require from public.kv where key = 'kc:settings';
  if v_type = 'review' and coalesce(v_require,false) and not coalesce(v_verified,false) then
    raise exception 'Please enter the order number and mobile number from your order to post a review';
  end if;
  if (select count(*) from public.posts where status = 'pending' and created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Too many posts right now. Please try again in a few minutes';
  end if;
  insert into public.posts (type, product_id, product_title, name, city, rating, recommend, title, body, photo, verified)
  values (v_type, nullif(p->>'productId',''), left(p->>'productTitle',120), left(trim(p->>'name'),60), left(nullif(trim(p->>'city'),''),60),
          case when p->>'rating' ~ '^[1-5]$' then (p->>'rating')::int end,
          case when p->>'recommend' in ('true','false') then (p->>'recommend')::boolean end,
          left(nullif(trim(p->>'title'),''),120), left(trim(p->>'body'),3000),
          case when p->>'photo' like 'data:image/%' and length(p->>'photo') < 400000 then p->>'photo' end,
          coalesce(v_verified,false))
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.submit_post(jsonb) to anon, authenticated;

-- =====================================================================
-- ADD THE FIRST ADMIN (only needed once; after that, add people in Settings > Staff accounts)
-- Replace the email, and use 'admin' or 'employee'.
-- =====================================================================
-- insert into public.staff (user_id, role, email)
-- select id, 'admin', email from auth.users where email = 'you@example.com'
-- on conflict (user_id) do update set role = excluded.role;
--
-- To remove someone's staff access:
-- delete from public.staff where email = 'person@example.com';
