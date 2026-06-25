-- Annule VehiculeAssignee : recopie les assignations dans notes puis supprime la table.

UPDATE "Vehicule" v
SET notes = trim(
  CASE
    WHEN position('[[ASSIGNEES:' in v.notes) > 0 THEN
      regexp_replace(v.notes, '\[\[ASSIGNEES:[^\]]*\]\]', '', 'g')
    ELSE v.notes
  END
) || E'\n\n[[ASSIGNEES:' || (
  SELECT json_build_object(
    'technicien_ids',
    COALESCE(
      (SELECT json_agg("userId" ORDER BY "userId")
       FROM "VehiculeAssignee"
       WHERE "vehiculeId" = v.id AND role = 'technicien'),
      '[]'::json
    ),
    'responsable_ids',
    COALESCE(
      (SELECT json_agg("userId" ORDER BY "userId")
       FROM "VehiculeAssignee"
       WHERE "vehiculeId" = v.id AND role = 'responsable'),
      '[]'::json
    )
  )::text
) || ']]'
WHERE EXISTS (
  SELECT 1 FROM "VehiculeAssignee" va WHERE va."vehiculeId" = v.id
);

DROP TABLE IF EXISTS "VehiculeAssignee";
