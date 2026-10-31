-- name: CreateAuditLog :one
INSERT INTO audit_logs (
    actor_type,
    actor_id,
    actor_name,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    ip_address
) VALUES (
    sqlc.arg(actor_type),
    sqlc.narg(actor_id),
    sqlc.arg(actor_name),
    sqlc.arg(action),
    sqlc.arg(entity_type),
    sqlc.narg(entity_id),
    sqlc.narg(before_data),
    sqlc.narg(after_data),
    sqlc.narg(ip_address)
)
RETURNING *;

-- name: ListAuditLogs :many
SELECT *
FROM audit_logs
WHERE (sqlc.narg(actor_type)::text IS NULL OR actor_type = sqlc.narg(actor_type)::text)
  AND (sqlc.narg(entity_type)::text IS NULL OR entity_type = sqlc.narg(entity_type)::text)
  AND (sqlc.narg(entity_id)::uuid IS NULL OR entity_id = sqlc.narg(entity_id)::uuid)
ORDER BY created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CountAuditLogs :one
SELECT count(*)
FROM audit_logs
WHERE (sqlc.narg(actor_type)::text IS NULL OR actor_type = sqlc.narg(actor_type)::text)
  AND (sqlc.narg(entity_type)::text IS NULL OR entity_type = sqlc.narg(entity_type)::text)
  AND (sqlc.narg(entity_id)::uuid IS NULL OR entity_id = sqlc.narg(entity_id)::uuid);
