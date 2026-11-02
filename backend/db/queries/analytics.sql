-- name: OrganizerCategoryStats :many
SELECT
    e.title AS event_title,
    c.name AS category_name,
    c.quota,
    (
        SELECT count(*)::int
        FROM registrations r
        WHERE r.category_id = c.id
          AND r.status IN ('approved', 'awaiting_payment', 'paid', 'checked_in')
    ) AS filled
FROM event_categories c
JOIN events e ON e.id = c.event_id
WHERE e.organization_id = sqlc.arg(organization_id)
ORDER BY e.event_start_at DESC, c.name ASC;

-- name: OrganizerRegistrationTrend :many
SELECT
    to_char(date_trunc('day', r.created_at), 'YYYY-MM-DD') AS day,
    count(*)::int AS registrations,
    count(*) FILTER (WHERE r.status IN ('paid', 'checked_in'))::int AS paid
FROM registrations r
JOIN events e ON e.id = r.event_id
WHERE e.organization_id = sqlc.arg(organization_id)
  AND r.created_at >= now() - interval '30 days'
GROUP BY date_trunc('day', r.created_at)
ORDER BY day ASC;

-- name: OrganizerJerseyRecap :many
SELECT
    ra.value AS size,
    count(*)::int AS count
FROM registration_answers ra
JOIN registration_form_fields f ON f.id = ra.field_id
JOIN registrations r ON r.id = ra.registration_id
JOIN events e ON e.id = r.event_id
WHERE e.organization_id = sqlc.arg(organization_id)
  AND f.field_key = 'jersey_size'
GROUP BY ra.value
ORDER BY count DESC;

-- name: OrganizerMoney :one
SELECT
    COALESCE((
        SELECT sum(p.amount)
        FROM payments p
        JOIN registrations r ON r.id = p.registration_id
        JOIN events e ON e.id = r.event_id
        WHERE e.organization_id = sqlc.arg(organization_id) AND p.status IN ('paid', 'partially_refunded')
    ), 0)::bigint AS collected,
    COALESCE((
        SELECT sum(d.amount)
        FROM disbursements d
        WHERE d.organization_id = sqlc.arg(organization_id) AND d.status = 'paid'
    ), 0)::bigint AS disbursed,
    COALESCE((
        SELECT sum(rf.amount)
        FROM refunds rf
        JOIN registrations r ON r.id = rf.registration_id
        JOIN events e ON e.id = r.event_id
        WHERE e.organization_id = sqlc.arg(organization_id) AND rf.status = 'refunded'
    ), 0)::bigint AS refunded;

-- name: OrganizerPendingCounts :one
SELECT
    (
        SELECT count(*)::int
        FROM registrations r
        JOIN events e ON e.id = r.event_id
        WHERE e.organization_id = sqlc.arg(organization_id) AND r.status = 'pending_verification'
    ) AS pending_verifications,
    (
        SELECT count(*)::int
        FROM registrations r
        JOIN events e ON e.id = r.event_id
        WHERE e.organization_id = sqlc.arg(organization_id) AND r.status IN ('paid', 'checked_in')
    ) AS paid_registrations;

-- name: AdminDashboardStats :one
SELECT
    (SELECT count(*)::int FROM events) AS total_events,
    (SELECT count(*)::int FROM events WHERE event_type = 'native') AS native_events,
    (SELECT count(*)::int FROM events WHERE event_type = 'external') AS external_events,
    (SELECT count(*)::int FROM registrations) AS total_registrations,
    COALESCE((SELECT sum(amount) FROM payments WHERE status IN ('paid', 'partially_refunded')), 0)::bigint AS gmv,
    COALESCE((SELECT sum(platform_fee) FROM payments WHERE status IN ('paid', 'partially_refunded')), 0)::bigint AS platform_revenue,
    (SELECT count(*)::int FROM organizations WHERE verification_status = 'pending') AS pending_organizations,
    (SELECT count(*)::int FROM events WHERE status = 'pending_review') AS pending_events,
    (SELECT count(*)::int FROM disputes WHERE status IN ('open', 'in_review')) AS open_disputes;

-- name: AdminMonthlyGrowth :many
WITH months AS (
    SELECT to_char(date_trunc('month', now()) - (interval '1 month' * n), 'YYYY-MM') AS month
    FROM generate_series(5, 0, -1) AS n
)
SELECT
    m.month,
    (SELECT count(*)::int FROM users u WHERE to_char(date_trunc('month', u.created_at), 'YYYY-MM') = m.month) AS users,
    (SELECT count(*)::int FROM registrations r WHERE to_char(date_trunc('month', r.created_at), 'YYYY-MM') = m.month) AS registrations,
    COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.status = 'paid' AND to_char(date_trunc('month', p.created_at), 'YYYY-MM') = m.month), 0)::bigint AS gmv
FROM months m
ORDER BY m.month ASC;

-- name: ListEventRegistrationExport :many
SELECT
    r.*,
    u.email,
    u.phone,
    c.name AS category_name
FROM registrations r
JOIN users u ON u.id = r.user_id
JOIN event_categories c ON c.id = r.category_id
WHERE r.event_id = sqlc.arg(event_id)
ORDER BY c.name ASC, r.full_name_snapshot ASC
LIMIT 5000;

-- name: ListBroadcastRecipients :many
SELECT DISTINCT u.id, u.email, u.full_name
FROM registrations r
JOIN users u ON u.id = r.user_id
WHERE r.event_id = sqlc.arg(event_id)
  AND r.status IN ('paid', 'checked_in')
ORDER BY u.full_name ASC;

-- name: CreateBroadcast :one
INSERT INTO broadcasts (
    event_id,
    sent_by,
    sent_by_name,
    channel,
    subject,
    message,
    recipients
) VALUES (
    sqlc.arg(event_id),
    sqlc.arg(sent_by),
    sqlc.arg(sent_by_name),
    sqlc.arg(channel),
    sqlc.arg(subject),
    sqlc.arg(message),
    sqlc.arg(recipients)
)
RETURNING *;

-- name: ListBroadcastsByEvent :many
SELECT *
FROM broadcasts
WHERE event_id = sqlc.arg(event_id)
ORDER BY sent_at DESC;

-- name: ListNotificationsByRecipient :many
SELECT *
FROM notifications
WHERE recipient_type = sqlc.arg(recipient_type)
  AND recipient_id = sqlc.arg(recipient_id)
ORDER BY created_at DESC
LIMIT 100;

-- name: CountUnreadNotifications :one
SELECT count(*)
FROM notifications
WHERE recipient_type = sqlc.arg(recipient_type)
  AND recipient_id = sqlc.arg(recipient_id)
  AND read_at IS NULL;

-- name: MarkNotificationRead :exec
UPDATE notifications
SET read_at = now()
WHERE id = sqlc.arg(id)
  AND recipient_type = sqlc.arg(recipient_type)
  AND recipient_id = sqlc.arg(recipient_id);

-- name: MarkAllNotificationsRead :exec
UPDATE notifications
SET read_at = now()
WHERE recipient_type = sqlc.arg(recipient_type)
  AND recipient_id = sqlc.arg(recipient_id)
  AND read_at IS NULL;
