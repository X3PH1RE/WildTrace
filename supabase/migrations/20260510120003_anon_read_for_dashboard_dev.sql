-- Dev-friendly read access for Next.js dashboard using the anon key.
-- Tighten these policies (or move to service-role API routes) before production.

create policy "species_select_anon"
  on public.species for select
  to anon
  using (true);

create policy "sightings_select_anon"
  on public.sightings for select
  to anon
  using (true);

create policy "users_select_anon"
  on public.users for select
  to anon
  using (true);

create policy "expert_reviews_select_anon"
  on public.expert_reviews for select
  to anon
  using (true);

create policy "individuals_select_anon"
  on public.individuals for select
  to anon
  using (true);
