-- name: CreateRegistration :one
INSERT INTO registrations (
    user_id,
    event_id,
    category_id,
    status,
    full_name_snapshot,
    birth_date_snapshot,
    price_amount,
    waitlist_position,
    submitted_at,
    payment_deadline_at,
    approved_at,
    refund_policy_id,
    refund_policy_version
) VALUES (
    sqlc.arg(user_id),
    sqlc.arg(event_id),
    sqlc.arg(category_id),
    sqlc.arg(status),
    sqlc.arg(full_name_snapshot),
    sqlc.narg(birth_date_snapshot),
    sqlc.arg(price_amount),
    sqlc.narg(waitlist_position),
    sqlc.narg(submitted_at),
    sqlc.narg(payment_deadline_at),
    sqlc.narg(approved_at),
    sqlc.narg(refund_policy_id),
    sqlc.narg(refund_policy_version)
)
RETURNING *;

-- name: GetRegistrationByID :one
SELECT *
FROM registrations
WHERE id = sqlc.arg(id);

-- name: GetRegistrationByIDForUser :one
SELECT *
FROM registrations
WHERE id = sqlc.arg(id) AND user_id = sqlc.arg(user_id);

-- name: GetRegistrationForOrganization :one
SELECT r.*
FROM registrations r
JOIN events e ON e.id = r.event_id
WHERE r.id = sqlc.arg(id) AND e.organization_id = sqlc.arg(organization_id);

-- name: ListRegistrationsByUser :many
SELECT *
FROM registrations
WHERE user_id = sqlc.arg(user_id)
ORDER BY created_at DESC
LIMIT 200;

-- name: ListRegistrationsForOrganization :many
SELECT r.*
FROM registrations r
JOIN events e ON e.id = r.event_id
WHERE e.organization_id = sqlc.arg(organization_id)
  AND (sqlc.narg(event_id)::uuid IS NULL OR r.event_id = sqlc.narg(event_id)::uuid)
  AND (sqlc.narg(status)::text IS NULL OR r.status = sqlc.narg(status)::text)
  AND (sqlc.narg(q)::text IS NULL OR r.full_name_snapshot ILIKE '%' || sqlc.narg(q)::text || '%' OR e.title ILIKE '%' || sqlc.narg(q)::text || '%')
ORDER BY r.submitted_at DESC NULLS LAST, r.created_at DESC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: CountRegistrationsForOrganization :one
SELECT count(*)
FROM registrations r
JOIN events e ON e.id = r.event_id
WHERE e.organization_id = sqlc.arg(organization_id)
  AND (sqlc.narg(event_id)::uuid IS NULL OR r.event_id = sqlc.narg(event_id)::uuid)
  AND (sqlc.narg(status)::text IS NULL OR r.status = sqlc.narg(status)::text)
  AND (sqlc.narg(q)::text IS NULL OR r.full_name_snapshot ILIKE '%' || sqlc.narg(q)::text || '%' OR e.title ILIKE '%' || sqlc.narg(q)::text || '%');

-- name: CountActiveRegistrationsByCategory :one
SELECT count(*)
FROM registrations
WHERE category_id = sqlc.arg(category_id)
  AND status IN ('approved', 'awaiting_payment', 'paid', 'checked_in');

-- name: GetNextWaitlistPosition :one
SELECT (COALESCE(MAX(waitlist_position), 0) + 1)::int AS next_position
FROM registrations
WHERE category_id = sqlc.arg(category_id) AND status = 'waitlisted';

-- name: GetOldestWaitlistedForCategory :one
SELECT *
FROM registrations
WHERE category_id = sqlc.arg(category_id) AND status = 'waitlisted'
ORDER BY waitlist_position ASC, created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- name: UpdateRegistrationStatus :one
UPDATE registrations
SET
    status = sqlc.arg(status),
    reviewed_by = sqlc.narg(reviewed_by),
    rejection_reason = sqlc.narg(rejection_reason),
    payment_deadline_at = sqlc.narg(payment_deadline_at),
    approved_at = sqlc.narg(approved_at),
    waitlist_position = sqlc.narg(waitlist_position),
    reviewed_at = sqlc.narg(reviewed_at)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: CreateRegistrationAnswer :one
INSERT INTO registration_answers (
    registration_id,
    field_id,
    value,
    is_encrypted
) VALUES (
    sqlc.arg(registration_id),
    sqlc.arg(field_id),
    sqlc.arg(value),
    sqlc.arg(is_encrypted)
)
RETURNING *;

-- name: ListRegistrationAnswersByRegistration :many
SELECT
    ra.id,
    ra.registration_id,
    ra.field_id,
    ra.value,
    ra.is_encrypted,
    rff.label AS field_label,
    rff.field_key,
    rff.is_sensitive,
    rff.sort_order
FROM registration_answers ra
JOIN registration_form_fields rff ON rff.id = ra.field_id
WHERE ra.registration_id = sqlc.arg(registration_id)
ORDER BY rff.sort_order ASC, rff.label ASC;

-- name: CreateQualificationSubmission :one
INSERT INTO registration_qualification_submissions (
    registration_id,
    requirement_id,
    value_text,
    file_key,
    external_link,
    status
) VALUES (
    sqlc.arg(registration_id),
    sqlc.arg(requirement_id),
    sqlc.narg(value_text),
    sqlc.narg(file_key),
    sqlc.narg(external_link),
    'submitted'
)
RETURNING *;

-- name: ListQualificationSubmissionsByRegistration :many
SELECT
    rqs.id,
    rqs.registration_id,
    rqs.requirement_id,
    rqs.value_text,
    rqs.file_key,
    rqs.external_link,
    rqs.status,
    rqs.reviewer_note,
    rqs.created_at,
    qr.label AS requirement_label,
    qr.requirement_type
FROM registration_qualification_submissions rqs
JOIN qualification_requirements qr ON qr.id = rqs.requirement_id
WHERE rqs.registration_id = sqlc.arg(registration_id)
ORDER BY qr.sort_order ASC, qr.label ASC;

-- name: SetQualificationSubmissionsStatus :exec
UPDATE registration_qualification_submissions
SET status = sqlc.arg(status), reviewer_note = sqlc.narg(reviewer_note)
WHERE registration_id = sqlc.arg(registration_id);

-- name: CreateRegistrationStatusLog :one
INSERT INTO registration_status_logs (
    registration_id,
    from_status,
    to_status,
    actor_type,
    actor_id,
    actor_name,
    note
) VALUES (
    sqlc.arg(registration_id),
    sqlc.narg(from_status),
    sqlc.arg(to_status),
    sqlc.arg(actor_type),
    sqlc.narg(actor_id),
    sqlc.arg(actor_name),
    sqlc.narg(note)
)
RETURNING *;

-- name: ListRegistrationStatusLogs :many
SELECT *
FROM registration_status_logs
WHERE registration_id = sqlc.arg(registration_id)
ORDER BY created_at ASC;

-- name: CreatePayment :one
INSERT INTO payments (
    registration_id,
    order_id,
    gateway,
    gateway_ref,
    method,
    amount,
    platform_fee,
    gateway_fee,
    status,
    expires_at
) VALUES (
    sqlc.arg(registration_id),
    sqlc.arg(order_id),
    sqlc.arg(gateway),
    sqlc.narg(gateway_ref),
    sqlc.arg(method),
    sqlc.arg(amount),
    sqlc.arg(platform_fee),
    sqlc.arg(gateway_fee),
    sqlc.arg(status),
    sqlc.arg(expires_at)
)
RETURNING *;

-- name: GetPaymentByRegistration :one
SELECT *
FROM payments
WHERE registration_id = sqlc.arg(registration_id)
ORDER BY created_at DESC
LIMIT 1;

-- name: CreateNotification :one
INSERT INTO notifications (
    recipient_type,
    recipient_id,
    channel,
    template_key,
    title,
    body,
    payload,
    status,
    sent_at
) VALUES (
    sqlc.arg(recipient_type),
    sqlc.arg(recipient_id),
    sqlc.arg(channel),
    sqlc.arg(template_key),
    sqlc.arg(title),
    sqlc.arg(body),
    sqlc.narg(payload),
    sqlc.arg(status),
    now()
)
RETURNING *;
