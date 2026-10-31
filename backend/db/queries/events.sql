-- name: CreateEvent :one
INSERT INTO events (
    organization_id,
    reviewed_by,
    event_type,
    title,
    slug,
    description,
    location_name,
    province,
    city,
    latitude,
    longitude,
    event_start_at,
    event_end_at,
    registration_open_at,
    registration_close_at,
    status,
    external_url,
    cover_key,
    route_gpx_key,
    route_profile,
    mandatory_gear,
    terms,
    is_featured,
    refund_policy_id,
    published_at,
    source_updated_at
) VALUES (
    sqlc.narg(organization_id),
    sqlc.narg(reviewed_by),
    sqlc.arg(event_type),
    sqlc.arg(title),
    sqlc.arg(slug),
    sqlc.arg(description),
    sqlc.arg(location_name),
    sqlc.arg(province),
    sqlc.arg(city),
    sqlc.arg(latitude),
    sqlc.arg(longitude),
    sqlc.arg(event_start_at),
    sqlc.arg(event_end_at),
    sqlc.narg(registration_open_at),
    sqlc.narg(registration_close_at),
    sqlc.arg(status),
    sqlc.narg(external_url),
    sqlc.narg(cover_key),
    sqlc.narg(route_gpx_key),
    sqlc.arg(route_profile),
    sqlc.arg(mandatory_gear),
    sqlc.arg(terms),
    sqlc.arg(is_featured),
    sqlc.narg(refund_policy_id),
    sqlc.narg(published_at),
    sqlc.narg(source_updated_at)
)
RETURNING *;

-- name: GetEventByID :one
SELECT *
FROM events
WHERE id = sqlc.arg(id);

-- name: GetEventByIDForOrganization :one
SELECT *
FROM events
WHERE id = sqlc.arg(id) AND organization_id = sqlc.arg(organization_id);

-- name: GetPublicEventBySlug :one
SELECT e.*
FROM events e
WHERE e.slug = sqlc.arg(slug)
  AND e.status IN ('published', 'registration_closed', 'completed')
LIMIT 1;

-- name: ListPublishedEvents :many
SELECT e.*
FROM events e
WHERE e.status = 'published'
  AND (sqlc.narg(q)::text IS NULL OR e.title ILIKE '%' || sqlc.narg(q)::text || '%' OR e.city ILIKE '%' || sqlc.narg(q)::text || '%')
  AND (sqlc.narg(province)::text IS NULL OR e.province = sqlc.narg(province)::text)
  AND (sqlc.narg(city)::text IS NULL OR e.city = sqlc.narg(city)::text)
  AND (sqlc.narg(event_type)::text IS NULL OR e.event_type = sqlc.narg(event_type)::text)
  AND (sqlc.narg(month)::text IS NULL OR to_char(e.event_start_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') = sqlc.narg(month)::text)
  AND (sqlc.narg(difficulty)::text IS NULL OR EXISTS (
      SELECT 1 FROM event_categories c WHERE c.event_id = e.id AND c.difficulty = sqlc.narg(difficulty)::text
  ))
  AND (sqlc.narg(min_price)::bigint IS NULL OR EXISTS (
      SELECT 1 FROM event_categories c WHERE c.event_id = e.id AND c.price >= sqlc.narg(min_price)::bigint
  ))
  AND (sqlc.narg(max_price)::bigint IS NULL OR EXISTS (
      SELECT 1 FROM event_categories c WHERE c.event_id = e.id AND c.price <= sqlc.narg(max_price)::bigint
  ))
  AND (
      sqlc.narg(registration_status)::text IS NULL
      OR (sqlc.narg(registration_status)::text = 'open'
          AND (e.registration_open_at IS NULL OR e.registration_open_at <= now())
          AND (e.registration_close_at IS NULL OR e.registration_close_at >= now()))
      OR (sqlc.narg(registration_status)::text = 'closed'
          AND ((e.registration_close_at IS NOT NULL AND e.registration_close_at < now())
               OR (e.registration_open_at IS NOT NULL AND e.registration_open_at > now())))
  )
ORDER BY
    e.is_featured DESC,
    CASE WHEN sqlc.arg(sort_by)::text = 'newest' THEN e.created_at END DESC,
    CASE WHEN sqlc.arg(sort_by)::text = 'title' THEN e.title END ASC,
    CASE WHEN sqlc.arg(sort_by)::text = 'event_date' THEN e.event_start_at END ASC,
    e.event_start_at ASC,
    e.id ASC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CountPublishedEvents :one
SELECT count(*)
FROM events e
WHERE e.status = 'published'
  AND (sqlc.narg(q)::text IS NULL OR e.title ILIKE '%' || sqlc.narg(q)::text || '%' OR e.city ILIKE '%' || sqlc.narg(q)::text || '%')
  AND (sqlc.narg(province)::text IS NULL OR e.province = sqlc.narg(province)::text)
  AND (sqlc.narg(city)::text IS NULL OR e.city = sqlc.narg(city)::text)
  AND (sqlc.narg(event_type)::text IS NULL OR e.event_type = sqlc.narg(event_type)::text)
  AND (sqlc.narg(month)::text IS NULL OR to_char(e.event_start_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') = sqlc.narg(month)::text)
  AND (sqlc.narg(difficulty)::text IS NULL OR EXISTS (
      SELECT 1 FROM event_categories c WHERE c.event_id = e.id AND c.difficulty = sqlc.narg(difficulty)::text
  ))
  AND (sqlc.narg(min_price)::bigint IS NULL OR EXISTS (
      SELECT 1 FROM event_categories c WHERE c.event_id = e.id AND c.price >= sqlc.narg(min_price)::bigint
  ))
  AND (sqlc.narg(max_price)::bigint IS NULL OR EXISTS (
      SELECT 1 FROM event_categories c WHERE c.event_id = e.id AND c.price <= sqlc.narg(max_price)::bigint
  ))
  AND (
      sqlc.narg(registration_status)::text IS NULL
      OR (sqlc.narg(registration_status)::text = 'open'
          AND (e.registration_open_at IS NULL OR e.registration_open_at <= now())
          AND (e.registration_close_at IS NULL OR e.registration_close_at >= now()))
      OR (sqlc.narg(registration_status)::text = 'closed'
          AND ((e.registration_close_at IS NOT NULL AND e.registration_close_at < now())
               OR (e.registration_open_at IS NOT NULL AND e.registration_open_at > now())))
  );

-- name: ListAdminEvents :many
SELECT e.*
FROM events e
LEFT JOIN organizations o ON o.id = e.organization_id
WHERE (sqlc.narg(status)::text IS NULL OR e.status = sqlc.narg(status)::text)
  AND (sqlc.narg(event_type)::text IS NULL OR e.event_type = sqlc.narg(event_type)::text)
  AND (sqlc.narg(q)::text IS NULL OR e.title ILIKE '%' || sqlc.narg(q)::text || '%' OR o.name ILIKE '%' || sqlc.narg(q)::text || '%')
ORDER BY
    CASE WHEN e.status = 'pending_review' THEN 0 ELSE 1 END,
    e.created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CountAdminEvents :one
SELECT count(*)
FROM events e
LEFT JOIN organizations o ON o.id = e.organization_id
WHERE (sqlc.narg(status)::text IS NULL OR e.status = sqlc.narg(status)::text)
  AND (sqlc.narg(event_type)::text IS NULL OR e.event_type = sqlc.narg(event_type)::text)
  AND (sqlc.narg(q)::text IS NULL OR e.title ILIKE '%' || sqlc.narg(q)::text || '%' OR o.name ILIKE '%' || sqlc.narg(q)::text || '%');

-- name: UpdateEvent :one
UPDATE events
SET
    title = sqlc.arg(title),
    slug = sqlc.arg(slug),
    description = sqlc.arg(description),
    location_name = sqlc.arg(location_name),
    province = sqlc.arg(province),
    city = sqlc.arg(city),
    latitude = sqlc.arg(latitude),
    longitude = sqlc.arg(longitude),
    event_start_at = sqlc.arg(event_start_at),
    event_end_at = sqlc.arg(event_end_at),
    registration_open_at = sqlc.narg(registration_open_at),
    registration_close_at = sqlc.narg(registration_close_at),
    cover_key = sqlc.narg(cover_key),
    route_gpx_key = sqlc.narg(route_gpx_key),
    route_profile = sqlc.arg(route_profile),
    mandatory_gear = sqlc.arg(mandatory_gear),
    terms = sqlc.arg(terms),
    refund_policy_id = sqlc.narg(refund_policy_id),
    is_featured = sqlc.arg(is_featured)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: UpdateExternalEvent :one
UPDATE events
SET
    title = sqlc.arg(title),
    description = sqlc.arg(description),
    location_name = sqlc.arg(location_name),
    province = sqlc.arg(province),
    city = sqlc.arg(city),
    latitude = sqlc.arg(latitude),
    longitude = sqlc.arg(longitude),
    event_start_at = sqlc.arg(event_start_at),
    event_end_at = sqlc.arg(event_end_at),
    external_url = sqlc.arg(external_url),
    cover_key = sqlc.narg(cover_key),
    source_updated_at = now()
WHERE id = sqlc.arg(id) AND event_type = 'external'
RETURNING *;

-- name: ReviewEvent :one
UPDATE events
SET
    status = sqlc.arg(status),
    reviewed_by = sqlc.narg(reviewed_by),
    published_at = CASE WHEN sqlc.arg(status)::text = 'published' THEN now() ELSE published_at END
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: SetEventStatus :one
UPDATE events
SET status = sqlc.arg(status)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: DeleteEvent :exec
DELETE FROM events
WHERE id = sqlc.arg(id);

-- name: CreateEventCategory :one
INSERT INTO event_categories (
    event_id,
    name,
    distance_km,
    elevation_gain_m,
    difficulty,
    price,
    quota,
    min_age,
    cutoff_minutes,
    requires_qualification,
    bib_prefix,
    bib_start,
    bib_end,
    bib_next
) VALUES (
    sqlc.arg(event_id),
    sqlc.arg(name),
    sqlc.arg(distance_km),
    sqlc.arg(elevation_gain_m),
    sqlc.arg(difficulty),
    sqlc.arg(price),
    sqlc.arg(quota),
    sqlc.arg(min_age),
    sqlc.arg(cutoff_minutes),
    sqlc.arg(requires_qualification),
    sqlc.arg(bib_prefix),
    sqlc.arg(bib_start),
    sqlc.arg(bib_end),
    sqlc.arg(bib_next)
)
RETURNING *;

-- name: GetEventCategoryByID :one
SELECT *
FROM event_categories
WHERE id = sqlc.arg(id);

-- name: GetEventCategoryForUpdate :one
SELECT *
FROM event_categories
WHERE id = sqlc.arg(id)
FOR UPDATE;

-- name: ListEventCategoriesByEventID :many
SELECT *
FROM event_categories
WHERE event_id = sqlc.arg(event_id)
ORDER BY distance_km ASC, created_at ASC;

-- name: ListEventCategoriesByEventIDs :many
SELECT *
FROM event_categories
WHERE event_id = ANY(sqlc.arg(event_ids)::uuid[])
ORDER BY event_id, distance_km ASC, created_at ASC;

-- name: UpdateEventCategory :one
UPDATE event_categories
SET
    name = sqlc.arg(name),
    distance_km = sqlc.arg(distance_km),
    elevation_gain_m = sqlc.arg(elevation_gain_m),
    difficulty = sqlc.arg(difficulty),
    price = sqlc.arg(price),
    quota = sqlc.arg(quota),
    min_age = sqlc.arg(min_age),
    cutoff_minutes = sqlc.arg(cutoff_minutes),
    requires_qualification = sqlc.arg(requires_qualification),
    bib_prefix = sqlc.arg(bib_prefix),
    bib_start = sqlc.arg(bib_start),
    bib_end = sqlc.arg(bib_end)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: IncrementCategoryBibNext :one
UPDATE event_categories
SET bib_next = bib_next + 1
WHERE id = sqlc.arg(id)
RETURNING bib_prefix, bib_next;

-- name: CreateQualificationRequirement :one
INSERT INTO qualification_requirements (
    category_id,
    requirement_type,
    label,
    description,
    is_required,
    sort_order
) VALUES (
    sqlc.arg(category_id),
    sqlc.arg(requirement_type),
    sqlc.arg(label),
    sqlc.arg(description),
    sqlc.arg(is_required),
    sqlc.arg(sort_order)
)
RETURNING *;

-- name: ListQualificationRequirementsByCategoryID :many
SELECT *
FROM qualification_requirements
WHERE category_id = sqlc.arg(category_id)
ORDER BY sort_order ASC, id ASC;

-- name: ListQualificationRequirementsByCategoryIDs :many
SELECT *
FROM qualification_requirements
WHERE category_id = ANY(sqlc.arg(category_ids)::uuid[])
ORDER BY category_id, sort_order ASC;

-- name: CreateRegistrationFormField :one
INSERT INTO registration_form_fields (
    event_id,
    field_key,
    label,
    field_type,
    options,
    is_required,
    is_sensitive,
    sort_order
) VALUES (
    sqlc.arg(event_id),
    sqlc.arg(field_key),
    sqlc.arg(label),
    sqlc.arg(field_type),
    sqlc.arg(options),
    sqlc.arg(is_required),
    sqlc.arg(is_sensitive),
    sqlc.arg(sort_order)
)
RETURNING *;

-- name: ListRegistrationFormFieldsByEventID :many
SELECT *
FROM registration_form_fields
WHERE event_id = sqlc.arg(event_id)
ORDER BY sort_order ASC, label ASC;

-- name: ListRegistrationFormFieldsByEventIDs :many
SELECT *
FROM registration_form_fields
WHERE event_id = ANY(sqlc.arg(event_ids)::uuid[])
ORDER BY event_id, sort_order ASC;

-- name: CreateRefundPolicy :one
INSERT INTO refund_policies (
    organization_id,
    name,
    policy_type,
    description,
    version
) VALUES (
    sqlc.arg(organization_id),
    sqlc.arg(name),
    sqlc.arg(policy_type),
    sqlc.arg(description),
    sqlc.arg(version)
)
RETURNING *;

-- name: CreateRefundPolicyRule :one
INSERT INTO refund_policy_rules (
    policy_id,
    days_before_event_min,
    days_before_event_max,
    refund_percent
) VALUES (
    sqlc.arg(policy_id),
    sqlc.arg(days_before_event_min),
    sqlc.narg(days_before_event_max),
    sqlc.arg(refund_percent)
)
RETURNING *;

-- name: GetRefundPolicyByID :one
SELECT *
FROM refund_policies
WHERE id = sqlc.arg(id);

-- name: ListRefundPolicyRulesByPolicyID :many
SELECT *
FROM refund_policy_rules
WHERE policy_id = sqlc.arg(policy_id)
ORDER BY days_before_event_min DESC;

-- name: ListRegistrationCountsByEventIDs :many
SELECT
    r.event_id,
    r.category_id,
    count(*)::int AS registration_count
FROM registrations r
WHERE r.event_id = ANY(sqlc.arg(event_ids)::uuid[])
  AND r.status IN ('approved', 'awaiting_payment', 'paid', 'checked_in')
GROUP BY r.event_id, r.category_id;

-- name: ListRegistrationCountsByEventID :many
SELECT
    r.category_id,
    count(*)::int AS registration_count
FROM registrations r
WHERE r.event_id = sqlc.arg(event_id)
  AND r.status IN ('approved', 'awaiting_payment', 'paid', 'checked_in')
GROUP BY r.category_id;

-- name: ListPublishedEventLocations :many
SELECT DISTINCT province, city
FROM events
WHERE status = 'published'
ORDER BY province ASC, city ASC;

-- name: ListPublishedDifficulties :many
SELECT DISTINCT c.difficulty
FROM event_categories c
JOIN events e ON e.id = c.event_id
WHERE e.status = 'published'
ORDER BY c.difficulty ASC;

-- name: ListPublishedEventsInRange :many
SELECT e.*
FROM events e
WHERE e.status = 'published'
  AND e.event_start_at >= sqlc.arg(range_start)
  AND e.event_start_at < sqlc.arg(range_end)
ORDER BY e.event_start_at ASC
LIMIT 500;

-- name: GetEventBySlugAny :one
SELECT *
FROM events
WHERE slug = sqlc.arg(slug)
LIMIT 1;
