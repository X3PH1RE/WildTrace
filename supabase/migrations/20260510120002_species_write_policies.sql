create policy "species_insert_authenticated"
  on public.species for insert
  to authenticated
  with check (true);

create policy "species_update_authenticated"
  on public.species for update
  to authenticated
  using (true)
  with check (true);
