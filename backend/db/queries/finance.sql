-- name: SumRefundedByPayment :one
SELECT COALESCE(sum(amount), 0)::bigint
FROM refunds
WHERE payment_id = sqlc.arg(payment_id) AND status = 'refunded';

-- name: CreateRefund :one
INSERT INTO refunds (
    payment_id,
    registration_id,
    amount,
    reason_type,
    status,
    gateway_ref,
    fee_borne_by,
    processed_by,
    requested_at,
    processed_at,
    note
) VALUES (
    sqlc.arg(payment_id),
    sqlc.arg(registration_id),
    sqlc.arg(amount),
    sqlc.arg(reason_type),
    sqlc.arg(status),
    sqlc.narg(gateway_ref),
    sqlc.arg(fee_borne_by),
    sqlc.narg(processed_by),
    now(),
    sqlc.narg(processed_at),
    sqlc.narg(note)
)
RETURNING *;

-- name: UpdateRefundStatus :one
UPDATE refunds
SET
    status = sqlc.arg(status),
    gateway_ref = sqlc.narg(gateway_ref),
    processed_by = sqlc.narg(processed_by),
    processed_at = sqlc.narg(processed_at),
    note = sqlc.narg(note)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: SetPaymentRefundStatus :one
UPDATE payments
SET status = sqlc.arg(status)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: SetRegistrationRefunded :one
UPDATE registrations
SET status = 'refunded'
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: RevokeTicketByRegistration :exec
UPDATE tickets
SET status = 'revoked'
WHERE registration_id = sqlc.arg(registration_id);

-- name: ListRefunds :many
SELECT
    rf.*,
    e.title AS event_title,
    o.name AS organization_name,
    u.full_name AS participant_name,
    p.order_id
FROM refunds rf
JOIN registrations r ON r.id = rf.registration_id
JOIN events e ON e.id = r.event_id
JOIN organizations o ON o.id = e.organization_id
JOIN users u ON u.id = r.user_id
JOIN payments p ON p.id = rf.payment_id
WHERE (sqlc.narg(status)::text IS NULL OR rf.status = sqlc.narg(status)::text)
ORDER BY rf.requested_at DESC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: CountRefunds :one
SELECT count(*)
FROM refunds rf
WHERE (sqlc.narg(status)::text IS NULL OR rf.status = sqlc.narg(status)::text);

-- name: GetEventCollected :one
SELECT (
    COALESCE((
        SELECT sum(p.amount)
        FROM payments p
        JOIN registrations r ON r.id = p.registration_id
        WHERE r.event_id = sqlc.arg(event_id) AND p.status IN ('paid', 'partially_refunded')
    ), 0)
    - COALESCE((
        SELECT sum(rf.amount)
        FROM refunds rf
        JOIN registrations r ON r.id = rf.registration_id
        WHERE r.event_id = sqlc.arg(event_id) AND rf.status = 'refunded'
    ), 0)
)::bigint AS collected;

-- name: SumDisbursementsByEvent :one
SELECT COALESCE(sum(amount), 0)::bigint
FROM disbursements
WHERE event_id = sqlc.arg(event_id) AND status IN ('approved', 'paid');

-- name: CreateDisbursement :one
INSERT INTO disbursements (
    event_id,
    organization_id,
    bank_account_id,
    stage,
    percentage,
    amount,
    status,
    requested_at,
    note
) VALUES (
    sqlc.arg(event_id),
    sqlc.arg(organization_id),
    sqlc.arg(bank_account_id),
    sqlc.arg(stage),
    sqlc.arg(percentage),
    sqlc.arg(amount),
    sqlc.arg(status),
    now(),
    sqlc.narg(note)
)
RETURNING *;

-- name: GetDisbursementByID :one
SELECT *
FROM disbursements
WHERE id = sqlc.arg(id);

-- name: UpdateDisbursementStatus :one
UPDATE disbursements
SET
    status = sqlc.arg(status),
    approved_by = sqlc.narg(approved_by),
    approved_at = sqlc.narg(approved_at),
    paid_at = sqlc.narg(paid_at),
    payout_ref = sqlc.narg(payout_ref),
    note = sqlc.narg(note)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: ListDisbursements :many
SELECT
    d.*,
    e.title AS event_title,
    o.name AS organization_name,
    b.bank_name,
    b.account_number_last4
FROM disbursements d
JOIN events e ON e.id = d.event_id
JOIN organizations o ON o.id = d.organization_id
LEFT JOIN organization_bank_accounts b ON b.id = d.bank_account_id
WHERE (sqlc.narg(status)::text IS NULL OR d.status = sqlc.narg(status)::text)
ORDER BY d.created_at DESC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: CountDisbursements :one
SELECT count(*)
FROM disbursements d
WHERE (sqlc.narg(status)::text IS NULL OR d.status = sqlc.narg(status)::text);

-- name: ListDisbursementsByOrganization :many
SELECT
    d.*,
    e.title AS event_title,
    b.bank_name,
    b.account_number_last4
FROM disbursements d
JOIN events e ON e.id = d.event_id
LEFT JOIN organization_bank_accounts b ON b.id = d.bank_account_id
WHERE d.organization_id = sqlc.arg(organization_id)
ORDER BY d.created_at DESC
LIMIT 200;

-- name: OrganizerFinanceSummary :one
SELECT
    COALESCE((
        SELECT sum(p.amount)
        FROM payments p
        JOIN registrations r ON r.id = p.registration_id
        JOIN events e ON e.id = r.event_id
        WHERE e.organization_id = sqlc.arg(organization_id) AND p.status IN ('paid', 'partially_refunded')
    ), 0)::bigint AS collected,
    COALESCE((
        SELECT sum(rf.amount)
        FROM refunds rf
        JOIN registrations r ON r.id = rf.registration_id
        JOIN events e ON e.id = r.event_id
        WHERE e.organization_id = sqlc.arg(organization_id) AND rf.status = 'refunded'
    ), 0)::bigint AS refunded,
    COALESCE((
        SELECT sum(d.amount)
        FROM disbursements d
        WHERE d.organization_id = sqlc.arg(organization_id) AND d.status = 'paid'
    ), 0)::bigint AS disbursed;

-- name: AdminFinanceSummary :one
SELECT
    COALESCE((SELECT sum(amount) FROM payments WHERE status IN ('paid', 'partially_refunded')), 0)::bigint AS gmv,
    COALESCE((SELECT sum(platform_fee) FROM payments WHERE status IN ('paid', 'partially_refunded')), 0)::bigint AS platform_revenue,
    COALESCE((SELECT sum(amount) FROM refunds WHERE status = 'refunded'), 0)::bigint AS refunded,
    COALESCE((SELECT sum(amount) FROM disbursements WHERE status = 'paid'), 0)::bigint AS disbursed,
    (SELECT count(*)::int FROM disbursements WHERE status IN ('pending', 'eligible', 'approved')) AS pending_disbursements,
    (SELECT count(*)::int FROM refunds WHERE status IN ('requested', 'processing')) AS pending_refunds;

-- name: CreateDispute :one
INSERT INTO disputes (
    event_id,
    registration_id,
    reporter_type,
    reporter_id,
    reporter_name,
    dispute_type,
    description,
    status
) VALUES (
    sqlc.arg(event_id),
    sqlc.narg(registration_id),
    sqlc.arg(reporter_type),
    sqlc.arg(reporter_id),
    sqlc.arg(reporter_name),
    sqlc.arg(dispute_type),
    sqlc.arg(description),
    'open'
)
RETURNING *;

-- name: ListDisputes :many
SELECT
    d.*,
    e.title AS event_title
FROM disputes d
JOIN events e ON e.id = d.event_id
WHERE (sqlc.narg(status)::text IS NULL OR d.status = sqlc.narg(status)::text)
ORDER BY d.created_at DESC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: CountDisputes :one
SELECT count(*)
FROM disputes d
WHERE (sqlc.narg(status)::text IS NULL OR d.status = sqlc.narg(status)::text);

-- name: ListDisputesByUser :many
SELECT
    d.*,
    e.title AS event_title
FROM disputes d
JOIN events e ON e.id = d.event_id
WHERE d.reporter_type = 'user' AND d.reporter_id = sqlc.arg(reporter_id)
ORDER BY d.created_at DESC
LIMIT 100;

-- name: UpdateDisputeStatus :one
UPDATE disputes
SET
    status = sqlc.arg(status),
    handled_by = sqlc.narg(handled_by),
    resolution = sqlc.narg(resolution),
    resolved_at = sqlc.narg(resolved_at)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: GetDisbursementByEventAndStage :one
SELECT *
FROM disbursements
WHERE event_id = sqlc.arg(event_id) AND stage = sqlc.arg(stage);
