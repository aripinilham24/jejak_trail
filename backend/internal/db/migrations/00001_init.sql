-- +goose Up
-- Fondasi skema Jejak Trail. Migrasi bersifat forward-only; untuk reset
-- development gunakan `make reset` (hapus volume Postgres lalu migrate+seed).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- ---------------------------------------------------------------------------
-- Akun dan organisasi
-- ---------------------------------------------------------------------------

CREATE TABLE admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    admin_role text NOT NULL CHECK (admin_role IN ('super_admin', 'support', 'finance')),
    two_factor_enabled boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_users_email_unique ON admin_users (lower(email));

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    password_hash text NOT NULL,
    google_id text,
    phone text,
    full_name text NOT NULL,
    birth_date date,
    gender text CHECK (gender IN ('male', 'female')),
    emergency_contact_name text,
    emergency_contact_phone text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    email_verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
CREATE UNIQUE INDEX users_phone_unique ON users (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX users_google_id_unique ON users (google_id) WHERE google_id IS NOT NULL;

CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    org_type text NOT NULL CHECK (org_type IN ('community', 'event_organizer', 'foundation')),
    official_email text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    province text NOT NULL,
    city text NOT NULL,
    legal_doc_key text,
    verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by uuid REFERENCES admin_users (id) ON DELETE SET NULL,
    verified_at timestamptz,
    rejection_reason text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organizations_verification_status_idx ON organizations (verification_status, created_at DESC);

CREATE TABLE organizer_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    phone text,
    position_title text,
    org_role text NOT NULL CHECK (org_role IN ('owner', 'verifier', 'racepack_staff', 'finance')),
    two_factor_enabled boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
    invited_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
-- Satu email hanya boleh menjadi akun organizer aktif pada satu organisasi
-- untuk MVP, agar login tidak ambigu. Multi-organisasi menyusul.
CREATE UNIQUE INDEX organizer_accounts_email_unique ON organizer_accounts (lower(email));
CREATE INDEX organizer_accounts_organization_idx ON organizer_accounts (organization_id);

CREATE TABLE organization_bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    bank_name text NOT NULL,
    account_number_encrypted text NOT NULL,
    account_number_last4 text NOT NULL,
    account_holder text NOT NULL,
    verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by uuid REFERENCES admin_users (id) ON DELETE SET NULL,
    verified_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organization_bank_accounts_org_idx ON organization_bank_accounts (organization_id);

CREATE TABLE user_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    doc_type text NOT NULL,
    file_key text,
    external_link text,
    label text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_documents_user_idx ON user_documents (user_id);

-- ---------------------------------------------------------------------------
-- Sesi dan token autentikasi
-- ---------------------------------------------------------------------------

CREATE TABLE refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type text NOT NULL CHECK (subject_type IN ('attendee', 'organizer', 'admin')),
    subject_id uuid NOT NULL,
    token_hash text NOT NULL UNIQUE,
    family_id uuid NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    replaced_by uuid,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_subject_idx ON refresh_tokens (subject_type, subject_id);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);
CREATE INDEX refresh_tokens_expires_idx ON refresh_tokens (expires_at);

CREATE TABLE auth_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose text NOT NULL CHECK (purpose IN ('email_verification', 'password_reset')),
    subject_type text NOT NULL CHECK (subject_type IN ('attendee', 'organizer', 'admin')),
    subject_id uuid NOT NULL,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_subject_idx ON auth_tokens (subject_type, subject_id, purpose);

-- ---------------------------------------------------------------------------
-- Kebijakan refund
-- ---------------------------------------------------------------------------

CREATE TABLE refund_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    name text NOT NULL,
    policy_type text NOT NULL CHECK (policy_type IN ('tiered', 'no_refund', 'full_refund')),
    description text NOT NULL DEFAULT '',
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name, version)
);

CREATE TABLE refund_policy_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id uuid NOT NULL REFERENCES refund_policies (id) ON DELETE CASCADE,
    days_before_event_min integer NOT NULL CHECK (days_before_event_min >= 0),
    days_before_event_max integer CHECK (days_before_event_max IS NULL OR days_before_event_max >= days_before_event_min),
    refund_percent integer NOT NULL CHECK (refund_percent BETWEEN 0 AND 100)
);
CREATE INDEX refund_policy_rules_policy_idx ON refund_policy_rules (policy_id);

-- ---------------------------------------------------------------------------
-- Event dan katalog
-- ---------------------------------------------------------------------------

CREATE TABLE events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations (id) ON DELETE SET NULL,
    reviewed_by uuid REFERENCES admin_users (id) ON DELETE SET NULL,
    event_type text NOT NULL CHECK (event_type IN ('native', 'external')),
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text NOT NULL DEFAULT '',
    location_name text NOT NULL,
    province text NOT NULL,
    city text NOT NULL,
    latitude numeric(9, 6) NOT NULL DEFAULT 0,
    longitude numeric(9, 6) NOT NULL DEFAULT 0,
    event_start_at timestamptz NOT NULL,
    event_end_at timestamptz NOT NULL,
    registration_open_at timestamptz,
    registration_close_at timestamptz,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'registration_closed', 'cancelled', 'completed', 'suspended')),
    external_url text,
    cover_key text,
    route_gpx_key text,
    route_profile jsonb NOT NULL DEFAULT '[]'::jsonb,
    mandatory_gear jsonb NOT NULL DEFAULT '[]'::jsonb,
    terms text NOT NULL DEFAULT '',
    is_featured boolean NOT NULL DEFAULT false,
    refund_policy_id uuid REFERENCES refund_policies (id) ON DELETE SET NULL,
    published_at timestamptz,
    source_updated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (event_type <> 'external' OR external_url IS NOT NULL)
);
CREATE INDEX events_status_start_idx ON events (status, event_start_at);
CREATE INDEX events_location_idx ON events (province, city);
CREATE INDEX events_org_idx ON events (organization_id);
CREATE INDEX events_title_trgm_idx ON events USING gin (title gin_trgm_ops);
CREATE INDEX events_city_trgm_idx ON events USING gin (city gin_trgm_ops);

CREATE TABLE event_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    name text NOT NULL,
    distance_km numeric(6, 2) NOT NULL CHECK (distance_km > 0),
    elevation_gain_m integer NOT NULL DEFAULT 0 CHECK (elevation_gain_m >= 0),
    difficulty text NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'hard', 'extreme')),
    price bigint NOT NULL DEFAULT 0 CHECK (price >= 0),
    quota integer NOT NULL DEFAULT 0 CHECK (quota >= 0),
    min_age integer NOT NULL DEFAULT 0 CHECK (min_age >= 0),
    cutoff_minutes integer NOT NULL DEFAULT 0 CHECK (cutoff_minutes >= 0),
    requires_qualification boolean NOT NULL DEFAULT false,
    bib_prefix text NOT NULL DEFAULT '',
    bib_start integer NOT NULL DEFAULT 1,
    bib_end integer NOT NULL DEFAULT 9999,
    bib_next integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, name),
    CHECK (bib_next >= bib_start),
    CHECK (bib_end >= bib_start)
);
CREATE INDEX event_categories_event_idx ON event_categories (event_id);

CREATE TABLE qualification_requirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES event_categories (id) ON DELETE CASCADE,
    requirement_type text NOT NULL CHECK (requirement_type IN ('finisher_certificate', 'race_result_link', 'profile_link', 'medical_certificate', 'custom_text')),
    label text NOT NULL,
    description text NOT NULL DEFAULT '',
    is_required boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX qualification_requirements_category_idx ON qualification_requirements (category_id);

CREATE TABLE registration_form_fields (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    field_key text NOT NULL,
    label text NOT NULL,
    field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'date', 'file', 'textarea', 'checkbox')),
    options jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_required boolean NOT NULL DEFAULT false,
    is_sensitive boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    UNIQUE (event_id, field_key)
);
CREATE INDEX registration_form_fields_event_idx ON registration_form_fields (event_id);

-- ---------------------------------------------------------------------------
-- Pendaftaran
-- ---------------------------------------------------------------------------

CREATE TABLE registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES event_categories (id) ON DELETE RESTRICT,
    status text NOT NULL CHECK (status IN ('pending_verification', 'approved', 'awaiting_payment', 'paid', 'rejected', 'expired', 'waitlisted', 'cancelled', 'refunded', 'checked_in')),
    full_name_snapshot text NOT NULL,
    birth_date_snapshot date,
    price_amount bigint NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
    waitlist_position integer,
    reviewed_by uuid REFERENCES organizer_accounts (id) ON DELETE SET NULL,
    submitted_at timestamptz,
    reviewed_at timestamptz,
    rejection_reason text,
    payment_deadline_at timestamptz,
    approved_at timestamptz,
    paid_at timestamptz,
    data_locked_at timestamptz,
    bib_number text,
    refund_policy_id uuid REFERENCES refund_policies (id) ON DELETE SET NULL,
    refund_policy_version integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Satu peserta hanya boleh punya satu pendaftaran aktif per event.
CREATE UNIQUE INDEX registrations_active_unique ON registrations (user_id, event_id)
    WHERE status IN ('pending_verification', 'approved', 'awaiting_payment', 'paid', 'waitlisted', 'checked_in');
CREATE INDEX registrations_event_category_status_idx ON registrations (event_id, category_id, status);
CREATE INDEX registrations_user_idx ON registrations (user_id, created_at DESC);
CREATE INDEX registrations_payment_deadline_idx ON registrations (payment_deadline_at) WHERE payment_deadline_at IS NOT NULL;
CREATE UNIQUE INDEX registrations_bib_unique ON registrations (category_id, bib_number) WHERE bib_number IS NOT NULL;

CREATE TABLE registration_qualification_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id uuid NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
    requirement_id uuid NOT NULL REFERENCES qualification_requirements (id) ON DELETE RESTRICT,
    value_text text,
    file_key text,
    external_link text,
    status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected')),
    reviewer_note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (registration_id, requirement_id)
);
CREATE INDEX registration_qualification_submissions_reg_idx ON registration_qualification_submissions (registration_id);

CREATE TABLE registration_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id uuid NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
    field_id uuid NOT NULL REFERENCES registration_form_fields (id) ON DELETE RESTRICT,
    value text NOT NULL DEFAULT '',
    is_encrypted boolean NOT NULL DEFAULT false,
    UNIQUE (registration_id, field_id)
);
CREATE INDEX registration_answers_reg_idx ON registration_answers (registration_id);

CREATE TABLE registration_status_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id uuid NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
    from_status text,
    to_status text NOT NULL,
    actor_type text NOT NULL CHECK (actor_type IN ('user', 'organizer', 'admin', 'system')),
    actor_id uuid,
    actor_name text NOT NULL DEFAULT '',
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX registration_status_logs_reg_idx ON registration_status_logs (registration_id, created_at);

-- ---------------------------------------------------------------------------
-- Pembayaran, refund, tiket
-- ---------------------------------------------------------------------------

CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id uuid NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
    order_id text NOT NULL UNIQUE,
    gateway text NOT NULL,
    gateway_ref text,
    method text NOT NULL CHECK (method IN ('va', 'ewallet', 'qris', 'card')),
    amount bigint NOT NULL CHECK (amount >= 0),
    platform_fee bigint NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
    gateway_fee bigint NOT NULL DEFAULT 0 CHECK (gateway_fee >= 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'failed', 'refunded', 'partially_refunded')),
    expires_at timestamptz NOT NULL,
    paid_at timestamptz,
    raw_payload jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_gateway_ref_unique ON payments (gateway, gateway_ref) WHERE gateway_ref IS NOT NULL;
CREATE INDEX payments_registration_idx ON payments (registration_id);
CREATE INDEX payments_status_expires_idx ON payments (status, expires_at);

CREATE TABLE refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
    registration_id uuid NOT NULL REFERENCES registrations (id) ON DELETE RESTRICT,
    amount bigint NOT NULL CHECK (amount >= 0),
    reason_type text NOT NULL CHECK (reason_type IN ('event_cancelled', 'participant_cancel', 'payment_error', 'overbooked', 'other')),
    status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'refunded', 'refund_failed')),
    gateway_ref text,
    fee_borne_by text NOT NULL DEFAULT 'platform' CHECK (fee_borne_by IN ('platform', 'organizer', 'participant')),
    processed_by uuid REFERENCES admin_users (id) ON DELETE SET NULL,
    requested_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    note text
);
CREATE INDEX refunds_payment_idx ON refunds (payment_id);
CREATE INDEX refunds_registration_idx ON refunds (registration_id);

CREATE TABLE tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id uuid NOT NULL UNIQUE REFERENCES registrations (id) ON DELETE CASCADE,
    qr_code text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'used', 'revoked')),
    issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE racepack_checkins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL UNIQUE REFERENCES tickets (id) ON DELETE CASCADE,
    checked_in_by uuid REFERENCES organizer_accounts (id) ON DELETE SET NULL,
    pickup_type text NOT NULL DEFAULT 'self' CHECK (pickup_type IN ('self', 'representative')),
    representative_name text,
    representative_note text,
    created_offline boolean NOT NULL DEFAULT false,
    client_id text UNIQUE,
    scanned_at timestamptz NOT NULL,
    synced_at timestamptz,
    CHECK (created_offline = false OR client_id IS NOT NULL)
);
CREATE INDEX racepack_checkins_synced_idx ON racepack_checkins (synced_at) WHERE synced_at IS NULL;

-- ---------------------------------------------------------------------------
-- Pencairan, sengketa, komunikasi, audit
-- ---------------------------------------------------------------------------

CREATE TABLE disbursements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events (id) ON DELETE RESTRICT,
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
    bank_account_id uuid NOT NULL REFERENCES organization_bank_accounts (id) ON DELETE RESTRICT,
    stage integer NOT NULL CHECK (stage IN (1, 2, 3)),
    percentage numeric(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    amount bigint NOT NULL CHECK (amount >= 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'eligible', 'approved', 'paid', 'held', 'rejected')),
    approved_by uuid REFERENCES admin_users (id) ON DELETE SET NULL,
    requested_at timestamptz,
    approved_at timestamptz,
    paid_at timestamptz,
    payout_ref text,
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, stage)
);
CREATE INDEX disbursements_org_idx ON disbursements (organization_id, created_at);

CREATE TABLE disbursement_conditions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    disbursement_id uuid NOT NULL REFERENCES disbursements (id) ON DELETE CASCADE,
    condition_key text NOT NULL,
    description text NOT NULL DEFAULT '',
    is_met boolean NOT NULL DEFAULT false,
    checked_by uuid REFERENCES admin_users (id) ON DELETE SET NULL,
    checked_at timestamptz,
    UNIQUE (disbursement_id, condition_key)
);

CREATE TABLE disputes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    registration_id uuid REFERENCES registrations (id) ON DELETE SET NULL,
    reporter_type text NOT NULL CHECK (reporter_type IN ('user', 'organizer', 'admin')),
    reporter_id uuid NOT NULL,
    reporter_name text NOT NULL DEFAULT '',
    dispute_type text NOT NULL CHECK (dispute_type IN ('payment', 'rejection', 'event_cancelled', 'refund', 'organizer_fraud', 'other')),
    description text NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
    handled_by uuid REFERENCES admin_users (id) ON DELETE SET NULL,
    resolution text,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);
CREATE INDEX disputes_status_idx ON disputes (status, created_at DESC);

CREATE TABLE broadcasts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    sent_by uuid,
    sent_by_name text NOT NULL DEFAULT '',
    channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'in_app')),
    subject text NOT NULL,
    message text NOT NULL,
    recipients integer NOT NULL DEFAULT 0,
    sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type text NOT NULL CHECK (recipient_type IN ('attendee', 'organizer', 'admin', 'system')),
    recipient_id uuid NOT NULL,
    channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'in_app')),
    template_key text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    payload jsonb,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('sent', 'queued', 'failed')),
    read_at timestamptz,
    sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_recipient_idx ON notifications (recipient_type, recipient_id, created_at DESC);
CREATE INDEX notifications_queue_idx ON notifications (status, created_at) WHERE status = 'queued';

CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type text NOT NULL CHECK (actor_type IN ('user', 'organizer', 'admin', 'system')),
    actor_id uuid,
    actor_name text NOT NULL DEFAULT '',
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    before_data jsonb,
    after_data jsonb,
    ip_address text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);

CREATE TABLE webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway text NOT NULL,
    event_id text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (gateway, event_id)
);

-- ---------------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER admin_users_set_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER organizer_accounts_set_updated_at BEFORE UPDATE ON organizer_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER organization_bank_accounts_set_updated_at BEFORE UPDATE ON organization_bank_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER event_categories_set_updated_at BEFORE UPDATE ON event_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER registrations_set_updated_at BEFORE UPDATE ON registrations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER registration_qualification_submissions_set_updated_at BEFORE UPDATE ON registration_qualification_submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
