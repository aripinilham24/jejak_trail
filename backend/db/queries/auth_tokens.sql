-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (
    subject_type,
    subject_id,
    token_hash,
    family_id,
    expires_at,
    ip_address,
    user_agent
) VALUES (
    sqlc.arg(subject_type),
    sqlc.arg(subject_id),
    sqlc.arg(token_hash),
    sqlc.arg(family_id),
    sqlc.arg(expires_at),
    sqlc.narg(ip_address),
    sqlc.narg(user_agent)
)
RETURNING *;

-- name: GetRefreshTokenByHash :one
SELECT *
FROM refresh_tokens
WHERE token_hash = sqlc.arg(token_hash);

-- name: RevokeRefreshToken :exec
UPDATE refresh_tokens
SET revoked_at = now()
WHERE id = sqlc.arg(id) AND revoked_at IS NULL;

-- name: RevokeRefreshTokenFamily :exec
UPDATE refresh_tokens
SET revoked_at = now()
WHERE family_id = sqlc.arg(family_id) AND revoked_at IS NULL;

-- name: DeleteExpiredRefreshTokens :exec
DELETE FROM refresh_tokens
WHERE expires_at < now() - interval '30 days';

-- name: CreateAuthToken :one
INSERT INTO auth_tokens (
    purpose,
    subject_type,
    subject_id,
    token_hash,
    expires_at
) VALUES (
    sqlc.arg(purpose),
    sqlc.arg(subject_type),
    sqlc.arg(subject_id),
    sqlc.arg(token_hash),
    sqlc.arg(expires_at)
)
RETURNING *;

-- name: GetAuthTokenByHash :one
SELECT *
FROM auth_tokens
WHERE token_hash = sqlc.arg(token_hash)
  AND purpose = sqlc.arg(purpose)
  AND consumed_at IS NULL
  AND expires_at > now()
LIMIT 1;

-- name: ConsumeAuthToken :exec
UPDATE auth_tokens
SET consumed_at = now()
WHERE id = sqlc.arg(id) AND consumed_at IS NULL;
