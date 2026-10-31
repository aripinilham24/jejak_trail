-- name: CreateAdminUser :one
INSERT INTO admin_users (email, password_hash, full_name, admin_role, two_factor_enabled)
VALUES (lower(sqlc.arg(email)), sqlc.arg(password_hash), sqlc.arg(full_name), sqlc.arg(admin_role), false)
RETURNING *;

-- name: GetAdminByEmail :one
SELECT *
FROM admin_users
WHERE lower(email) = lower(sqlc.arg(email))
LIMIT 1;

-- name: GetAdminByID :one
SELECT *
FROM admin_users
WHERE id = sqlc.arg(id);

-- name: CreateOrganization :one
INSERT INTO organizations (
    name,
    org_type,
    official_email,
    phone,
    address,
    province,
    city,
    legal_doc_key
) VALUES (
    sqlc.arg(name),
    sqlc.arg(org_type),
    lower(sqlc.arg(official_email)),
    sqlc.arg(phone),
    sqlc.arg(address),
    sqlc.arg(province),
    sqlc.arg(city),
    sqlc.narg(legal_doc_key)
)
RETURNING *;

-- name: GetOrganizationByID :one
SELECT *
FROM organizations
WHERE id = sqlc.arg(id);

-- name: GetOrganizationWithEventCount :one
SELECT
    o.*,
    (SELECT count(*) FROM events e WHERE e.organization_id = o.id)::int AS event_count
FROM organizations o
WHERE o.id = sqlc.arg(id);

-- name: ListOrganizations :many
SELECT
    o.*,
    (SELECT count(*) FROM events e WHERE e.organization_id = o.id)::int AS event_count
FROM organizations o
WHERE (sqlc.narg(verification_status)::text IS NULL OR o.verification_status = sqlc.narg(verification_status)::text)
  AND (sqlc.narg(q)::text IS NULL OR o.name ILIKE '%' || sqlc.narg(q)::text || '%' OR o.official_email ILIKE '%' || sqlc.narg(q)::text || '%')
ORDER BY o.created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CountOrganizations :one
SELECT count(*)
FROM organizations o
WHERE (sqlc.narg(verification_status)::text IS NULL OR o.verification_status = sqlc.narg(verification_status)::text)
  AND (sqlc.narg(q)::text IS NULL OR o.name ILIKE '%' || sqlc.narg(q)::text || '%' OR o.official_email ILIKE '%' || sqlc.narg(q)::text || '%');

-- name: UpdateOrganization :one
UPDATE organizations
SET
    name = sqlc.arg(name),
    org_type = sqlc.arg(org_type),
    official_email = lower(sqlc.arg(official_email)),
    phone = sqlc.arg(phone),
    address = sqlc.arg(address),
    province = sqlc.arg(province),
    city = sqlc.arg(city),
    legal_doc_key = sqlc.narg(legal_doc_key)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: VerifyOrganization :one
UPDATE organizations
SET
    verification_status = sqlc.arg(verification_status),
    verified_by = sqlc.narg(verified_by),
    verified_at = CASE WHEN sqlc.arg(verification_status)::text = 'verified' THEN now() ELSE NULL END,
    rejection_reason = sqlc.narg(rejection_reason)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: CreateOrganizerAccount :one
INSERT INTO organizer_accounts (
    organization_id,
    email,
    password_hash,
    full_name,
    phone,
    position_title,
    org_role,
    status
) VALUES (
    sqlc.arg(organization_id),
    lower(sqlc.arg(email)),
    sqlc.arg(password_hash),
    sqlc.arg(full_name),
    sqlc.narg(phone),
    sqlc.narg(position_title),
    sqlc.arg(org_role),
    sqlc.arg(status)
)
RETURNING *;

-- name: GetOrganizerByEmail :one
SELECT *
FROM organizer_accounts
WHERE lower(email) = lower(sqlc.arg(email))
  AND status <> 'disabled'
LIMIT 1;

-- name: GetOrganizerByID :one
SELECT *
FROM organizer_accounts
WHERE id = sqlc.arg(id);

-- name: ListOrganizerAccountsByOrganization :many
SELECT *
FROM organizer_accounts
WHERE organization_id = sqlc.arg(organization_id)
ORDER BY created_at ASC;

-- name: CreateBankAccount :one
INSERT INTO organization_bank_accounts (
    organization_id,
    bank_name,
    account_number_encrypted,
    account_number_last4,
    account_holder
) VALUES (
    sqlc.arg(organization_id),
    sqlc.arg(bank_name),
    sqlc.arg(account_number_encrypted),
    sqlc.arg(account_number_last4),
    sqlc.arg(account_holder)
)
RETURNING *;

-- name: GetActiveBankAccountByOrganization :one
SELECT *
FROM organization_bank_accounts
WHERE organization_id = sqlc.arg(organization_id) AND is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- name: ListBankAccountsByOrganization :many
SELECT *
FROM organization_bank_accounts
WHERE organization_id = sqlc.arg(organization_id)
ORDER BY created_at DESC;

-- name: SetBankAccountVerification :one
UPDATE organization_bank_accounts
SET
    verification_status = sqlc.arg(verification_status),
    verified_by = sqlc.narg(verified_by),
    verified_at = CASE WHEN sqlc.arg(verification_status)::text = 'verified' THEN now() ELSE NULL END
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: ListOrganizationsByIDs :many
SELECT *
FROM organizations
WHERE id = ANY(sqlc.arg(ids)::uuid[]);
