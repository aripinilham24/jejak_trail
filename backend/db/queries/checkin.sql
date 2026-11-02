-- name: GetTicketForScan :one
SELECT
    t.id AS ticket_id,
    t.qr_code,
    t.status AS ticket_status,
    t.issued_at,
    r.id AS registration_id,
    r.event_id,
    r.category_id,
    r.bib_number,
    r.full_name_snapshot,
    r.status AS registration_status,
    c.name AS category_name,
    e.organization_id
FROM tickets t
JOIN registrations r ON r.id = t.registration_id
JOIN events e ON e.id = r.event_id
JOIN event_categories c ON c.id = r.category_id
WHERE t.qr_code = sqlc.arg(qr_code);

-- name: ListCheckinManifest :many
SELECT
    t.id AS ticket_id,
    t.qr_code,
    t.status AS ticket_status,
    r.id AS registration_id,
    r.bib_number,
    r.full_name_snapshot,
    r.status AS registration_status,
    c.name AS category_name,
    rc.id AS checkin_id,
    rc.pickup_type,
    rc.representative_name,
    rc.created_offline,
    rc.scanned_at,
    rc.synced_at,
    oa.full_name AS checked_in_by_name
FROM registrations r
JOIN tickets t ON t.registration_id = r.id
JOIN event_categories c ON c.id = r.category_id
LEFT JOIN racepack_checkins rc ON rc.ticket_id = t.id
LEFT JOIN organizer_accounts oa ON oa.id = rc.checked_in_by
WHERE r.event_id = sqlc.arg(event_id)
  AND r.status IN ('paid', 'checked_in')
ORDER BY c.name ASC, r.full_name_snapshot ASC;

-- name: GetCheckinByTicket :one
SELECT *
FROM racepack_checkins
WHERE ticket_id = sqlc.arg(ticket_id);

-- name: GetCheckinByClientID :one
SELECT *
FROM racepack_checkins
WHERE client_id = sqlc.arg(client_id);

-- name: CreateRacepackCheckin :one
INSERT INTO racepack_checkins (
    ticket_id,
    checked_in_by,
    pickup_type,
    representative_name,
    representative_note,
    created_offline,
    client_id,
    scanned_at,
    synced_at
) VALUES (
    sqlc.arg(ticket_id),
    sqlc.arg(checked_in_by),
    sqlc.arg(pickup_type),
    sqlc.narg(representative_name),
    sqlc.narg(representative_note),
    sqlc.arg(created_offline),
    sqlc.narg(client_id),
    sqlc.arg(scanned_at),
    sqlc.narg(synced_at)
)
RETURNING *;

-- name: UpdateTicketStatus :one
UPDATE tickets
SET status = sqlc.arg(status)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: MarkRegistrationCheckedIn :one
UPDATE registrations
SET status = 'checked_in'
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: CountEventCheckins :one
SELECT count(*)
FROM racepack_checkins rc
JOIN tickets t ON t.id = rc.ticket_id
JOIN registrations r ON r.id = t.registration_id
WHERE r.event_id = sqlc.arg(event_id);
