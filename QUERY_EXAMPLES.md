# Query examples

## Find visually inspected figures

```sql
SELECT observation_id, source_id, title, image_type
FROM visual_observations
ORDER BY source_id, observation_id;
```

## Find circle and enclosure evidence

```sql
SELECT observation_id, source_id, title, primitive_geometry, enclosure
FROM observations
WHERE lower(coalesce(primitive_geometry, '')) LIKE '%circl%'
   OR lower(coalesce(enclosure, '')) LIKE '%enclos%'
   OR lower(coalesce(enclosure, '')) LIKE '%bound%';
```

## Compare raw records with lineage-adjusted weight

```sql
SELECT
  source_id,
  COUNT(*) AS raw_observations,
  ROUND(SUM(CAST(lineage_weight AS REAL)), 3) AS lineage_adjusted_weight
FROM observations
GROUP BY source_id
ORDER BY source_id;
```

## Inspect deterministic construction evidence

```sql
SELECT observation_id, source_id, title, construction_grammar
FROM observations
WHERE lower(coalesce(construction_grammar, '')) LIKE '%delete%'
   OR lower(coalesce(construction_grammar, '')) LIKE '%map%'
   OR lower(coalesce(construction_grammar, '')) LIKE '%grid%'
   OR lower(coalesce(construction_grammar, '')) LIKE '%sequence%';
```
