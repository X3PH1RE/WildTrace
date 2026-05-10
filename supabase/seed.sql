-- Sample species for local dev / staging
insert into public.species (
  common_name,
  scientific_name,
  rarity_tier,
  conservation_status,
  is_invasive,
  ecological_role,
  description
) values
(
  'Asian Elephant',
  'Elephas maximus',
  'Epic',
  'Endangered',
  false,
  'Seed disperser, ecosystem engineer',
  'Large herbivorous mammal native to Asia.'
),
(
  'Lantana',
  'Lantana camara',
  'Common',
  'Least Concern',
  true,
  'Invasive understory weed',
  'Aggressive invasive plant in many tropical regions.'
);
