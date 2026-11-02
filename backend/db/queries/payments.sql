-- name: GetPaymentByOrderID :one
SELECT *
FROM payments
WHERE order_id = sqlc.arg(order_id);

-- name: GetPaymentByOrderIDForUpdate :one
SELECT *
FROM payments
WHERE order_id = sqlc.arg(order_id)
FOR UPDATE;

-- name: UpdatePaymentStatus :one
UPDATE payments
SET
    status = sqlc.arg(status),
    gateway_ref = sqlc.narg(gateway_ref),
    paid_at = sqlc.narg(paid_at),
    raw_payload = sqlc.narg(raw_payload)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: GetRegistrationForUpdate :one
SELECT *
FROM registrations
WHERE id = sqlc.arg(id)
FOR UPDATE;

-- name: MarkRegistrationPaid :one
UPDATE registrations
SET
    status = 'paid',
    paid_at = sqlc.arg(paid_at),
    data_locked_at = sqlc.arg(paid_at),
    payment_deadline_at = NULL,
    bib_number = sqlc.arg(bib_number)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: AssignCategoryBib :one
UPDATE event_categories
SET bib_next = bib_next + 1
WHERE id = sqlc.arg(id)
RETURNING bib_prefix, (bib_next - 1)::int AS assigned_number, bib_start, bib_end;

-- name: CreateTicket :one
INSERT INTO tickets (
    registration_id,
    qr_code,
    status,
    issued_at
) VALUES (
    sqlc.arg(registration_id),
    sqlc.arg(qr_code),
    'issued',
    now()
)
RETURNING *;

-- name: GetTicketByRegistration :one
SELECT *
FROM tickets
WHERE registration_id = sqlc.arg(registration_id);

-- name: GetTicketByIDForUser :one
SELECT t.*
FROM tickets t
JOIN registrations r ON r.id = t.registration_id
WHERE t.id = sqlc.arg(id) AND r.user_id = sqlc.arg(user_id);

-- name: ListTicketsByUser :many
SELECT
    t.id,
    t.registration_id,
    t.qr_code,
    t.status,
    t.issued_at,
    r.bib_number,
    r.full_name_snapshot,
    r.status AS registration_status,
    e.title AS event_title,
    e.slug AS event_slug,
    e.event_start_at,
    e.location_name,
    e.city,
    e.province,
    c.name AS category_name
FROM tickets t
JOIN registrations r ON r.id = t.registration_id
JOIN events e ON e.id = r.event_id
JOIN event_categories c ON c.id = r.category_id
WHERE r.user_id = sqlc.arg(user_id)
ORDER BY t.issued_at DESC;

-- name: CreateWebhookEvent :one
INSERT INTO webhook_events (gateway, event_id, payload)
VALUES (sqlc.arg(gateway), sqlc.arg(event_id), sqlc.arg(payload))
ON CONFLICT (gateway, event_id) DO NOTHING
RETURNING *;

-- name: MarkWebhookProcessed :exec
UPDATE webhook_events
SET processed_at = now()
WHERE id = sqlc.arg(id);

-- name: ListExpiredPendingPayments :many
SELECT *
FROM payments
WHERE status = 'pending' AND expires_at < now()
ORDER BY expires_at ASC
LIMIT sqlc.arg(page_limit)::int;
