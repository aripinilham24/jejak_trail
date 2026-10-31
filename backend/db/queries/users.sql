-- name: CreateUser :one
INSERT INTO users (
    email,
    password_hash,
    phone,
    full_name,
    birth_date,
    gender,
    emergency_contact_name,
    emergency_contact_phone,
    email_verified_at
) VALUES (
    lower(sqlc.arg(email)),
    sqlc.arg(password_hash),
    sqlc.narg(phone),
    sqlc.arg(full_name),
    sqlc.narg(birth_date),
    sqlc.narg(gender),
    sqlc.narg(emergency_contact_name),
    sqlc.narg(emergency_contact_phone),
    sqlc.narg(email_verified_at)
)
RETURNING *;

-- name: GetUserByEmail :one
SELECT *
FROM users
WHERE lower(email) = lower(sqlc.arg(email))
LIMIT 1;

-- name: GetUserByID :one
SELECT *
FROM users
WHERE id = sqlc.arg(id);

-- name: UpdateUserProfile :one
UPDATE users
SET
    full_name = sqlc.arg(full_name),
    phone = sqlc.narg(phone),
    birth_date = sqlc.narg(birth_date),
    gender = sqlc.narg(gender),
    emergency_contact_name = sqlc.narg(emergency_contact_name),
    emergency_contact_phone = sqlc.narg(emergency_contact_phone)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: SetUserEmailVerified :exec
UPDATE users
SET email_verified_at = now()
WHERE id = sqlc.arg(id) AND email_verified_at IS NULL;
