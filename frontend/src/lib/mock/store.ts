import { useSyncExternalStore } from "react"
import type {
  Disbursement,
  Event,
  Notification,
  Organization,
  Registration,
  RegistrationStatus,
  Ticket,
} from "@/types"
import { buildDatabase, type Database } from "./data"

let database: Database = buildDatabase()
let snapshot: Database = database

const listeners = new Set<() => void>()

function commit() {
  snapshot = { ...database }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

/** Snapshot reaktif dari "basis data" demo. */
export function useDb(): Database {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/* ------------------------------------------------------------------ */
/* Selectors                                                          */
/* ------------------------------------------------------------------ */

export const db = {
  get raw() {
    return snapshot
  },
  events() {
    return snapshot.events
  },
  eventBySlug(slug: string) {
    return snapshot.events.find((e) => e.slug === slug)
  },
  eventById(id: string) {
    return snapshot.events.find((e) => e.id === id)
  },
  registrationsOf(userId: string) {
    return snapshot.registrations
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  },
  registrationById(id: string) {
    return snapshot.registrations.find((r) => r.id === id)
  },
  registrationsForEvent(eventId: string) {
    return snapshot.registrations.filter((r) => r.eventId === eventId)
  },
  notificationsOf(userId: string) {
    return snapshot.notifications
      .filter((n) => n.recipientId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  organizerProfile(organizationId: string) {
    return snapshot.organizations.find((o) => o.id === organizationId)
  },
}

/* ------------------------------------------------------------------ */
/* Mutations (simulasi aksi backend)                                  */
/* ------------------------------------------------------------------ */

function appendStatusLog(
  registration: Registration,
  from: RegistrationStatus | null,
  to: RegistrationStatus,
  actorType: "user" | "organizer" | "admin" | "system",
  actorName: string,
  note?: string,
) {
  registration.statusLogs = [
    ...registration.statusLogs,
    {
      id: `log-${registration.id}-${registration.statusLogs.length + 1}-${Date.now()}`,
      registrationId: registration.id,
      fromStatus: from,
      toStatus: to,
      actorType,
      actorName,
      note,
      createdAt: new Date().toISOString(),
    },
  ]
}

function pushNotification(
  userId: string,
  title: string,
  body: string,
  templateKey: string,
) {
  const notification: Notification = {
    id: `ntf-live-${snapshot.notifications.length + 1}-${Date.now()}`,
    recipientType: "attendee",
    recipientId: userId,
    channel: "email",
    templateKey,
    title,
    body,
    status: "sent",
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
  db.raw.notifications.unshift(notification)
}

export const actions = {
  approveRegistration(registrationId: string) {
    const registration = db.registrationById(registrationId)
    if (!registration) return
    const previous = registration.status
    registration.status = "awaiting_payment"
    registration.approvedAt = new Date().toISOString()
    registration.reviewedAt = registration.approvedAt
    registration.paymentDeadlineAt = new Date(Date.now() + 1.5 * 86_400_000).toISOString()
    registration.rejectionReason = undefined

    const rand = Math.floor(Math.random() * 90000) + 10000
    if (!registration.payment) {
      const payment = {
        id: `pay-live-${snapshot.payments.length + 1}`,
        registrationId: registration.id,
        orderId: `JT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${rand}`,
        gateway: "Midtrans",
        method: "va" as const,
        amount: registration.category?.price ?? 0,
        platformFee: Math.round((registration.category?.price ?? 0) * 0.03),
        gatewayFee: Math.round((registration.category?.price ?? 0) * 0.014) + 1000,
        status: "pending" as const,
        expiresAt: registration.paymentDeadlineAt,
        createdAt: new Date().toISOString(),
      }
      db.raw.payments.push(payment)
      registration.payment = payment
    } else {
      registration.payment.status = "pending"
      registration.payment.expiresAt = registration.paymentDeadlineAt
    }

    registration.qualificationSubmissions.forEach((submission) => {
      submission.status = "accepted"
    })
    appendStatusLog(
      registration,
      previous,
      "awaiting_payment",
      "organizer",
      "Verifikator Pendaftaran",
      "Dokumen kualifikasi sesuai, tagihan diterbitkan.",
    )
    pushNotification(
      registration.userId,
      "Pendaftaran disetujui",
      "Dokumen kualifikasi Anda sesuai. Tagihan sudah diterbitkan, segera lakukan pembayaran sebelum batas waktu.",
      "registration.approved",
    )
    commit()
  },

  rejectRegistration(registrationId: string, reason: string) {
    const registration = db.registrationById(registrationId)
    if (!registration) return
    const previous = registration.status
    registration.status = "rejected"
    registration.rejectionReason = reason
    registration.reviewedAt = new Date().toISOString()
    registration.paymentDeadlineAt = undefined
    registration.qualificationSubmissions.forEach((submission) => {
      submission.status = "rejected"
      submission.reviewerNote = reason
    })
    appendStatusLog(
      registration,
      previous,
      "rejected",
      "organizer",
      "Verifikator Pendaftaran",
      reason,
    )
    pushNotification(
      registration.userId,
      "Pendaftaran ditolak",
      `Pendaftaran Anda ditolak dengan alasan: ${reason}. Anda dapat mengajukan ulang dengan dokumen baru.`,
      "registration.rejected",
    )
    commit()
  },

  markPaid(registrationId: string) {
    const registration = db.registrationById(registrationId)
    if (!registration) return
    const previous = registration.status
    const now = new Date().toISOString()
    registration.status = "paid"
    registration.paidAt = now
    registration.dataLockedAt = now
    registration.paymentDeadlineAt = undefined
    if (registration.payment) {
      registration.payment.status = "paid"
      registration.payment.paidAt = now
      registration.payment.gatewayRef = `mid-${Math.floor(Math.random() * 1e8)}`
    }
    const category = registration.category
    if (category && !registration.bibNumber) {
      category.bibNext += 1
      registration.bibNumber = `${category.bibPrefix}-${String(category.bibNext).padStart(4, "0")}`
    }
    if (!registration.ticket) {
      const ticket: Ticket = {
        id: `tkt-live-${snapshot.tickets.length + 1}`,
        registrationId: registration.id,
        qrCode: `JT-${registration.bibNumber ?? "TRL"}-${Math.floor(Math.random() * 900000 + 100000)}`,
        status: "issued",
        issuedAt: now,
      }
      db.raw.tickets.push(ticket)
      registration.ticket = ticket
    }
    appendStatusLog(
      registration,
      previous,
      "paid",
      "system",
      "Payment Gateway",
      "Webhook pembayaran valid. Data terkunci, BIB dan tiket QR diterbitkan.",
    )
    pushNotification(
      registration.userId,
      "Pembayaran berhasil",
      `Pembayaran diterima. BIB Anda ${registration.bibNumber}. Tiket QR sudah aktif.`,
      "registration.paid",
    )
    commit()
  },

  markExpired(registrationId: string) {
    const registration = db.registrationById(registrationId)
    if (!registration) return
    const previous = registration.status
    registration.status = "expired"
    registration.paymentDeadlineAt = undefined
    if (registration.payment) registration.payment.status = "expired"
    appendStatusLog(
      registration,
      previous,
      "expired",
      "system",
      "Sistem",
      "Batas waktu pembayaran terlewat. Slot dilepas ke daftar tunggu.",
    )
    pushNotification(
      registration.userId,
      "Pendaftaran kedaluwarsa",
      "Batas waktu pembayaran terlewat sehingga slot Anda dilepas ke daftar tunggu.",
      "registration.expired",
    )
    commit()
  },

  checkInTicket(ticketId: string, payload?: { pickupType?: "self" | "representative"; representativeName?: string; offline?: boolean }): { ok: boolean; message: string } {
    const ticket = snapshot.tickets.find((t) => t.id === ticketId)
    if (!ticket) return { ok: false, message: "Tiket tidak ditemukan pada daftar peserta." }
    const registration = db.registrationById(ticket.registrationId)
    if (!registration) return { ok: false, message: "Pendaftaran tidak ditemukan." }
    if (ticket.status === "used") {
      const existing = snapshot.checkins.find((c) => c.ticketId === ticket.id)
      return {
        ok: false,
        message: `QR sudah dipindai sebelumnya${existing ? ` pada ${new Date(existing.scannedAt).toLocaleString("id-ID")}` : ""}.`,
      }
    }
    ticket.status = "used"
    const now = new Date().toISOString()
    const checkin = {
      id: `chk-live-${snapshot.checkins.length + 1}`,
      ticketId: ticket.id,
      checkedInBy: "oa-live-staff",
      checkedInByName: "Koordinator Racepack",
      pickupType: payload?.pickupType ?? ("self" as const),
      representativeName: payload?.representativeName,
      representativeNote: payload?.pickupType === "representative" ? "Diwakilkan dengan surat kuasa" : undefined,
      createdOffline: Boolean(payload?.offline),
      scannedAt: now,
      syncedAt: payload?.offline ? undefined : now,
    }
    db.raw.checkins.push(checkin)
    const previous = registration.status
    registration.status = "checked_in"
    appendStatusLog(
      registration,
      previous,
      "checked_in",
      "organizer",
      "Koordinator Racepack",
      payload?.pickupType === "representative"
        ? `Racepack diambil perwakilan ${payload.representativeName ?? ""}`.trim()
        : "Racepack diambil langsung oleh peserta.",
    )
    commit()
    return {
      ok: true,
      message: `${registration.fullNameSnapshot} — BIB ${registration.bibNumber ?? "-"} berhasil check-in.`,
    }
  },

  verifyOrganization(organizationId: string, approve: boolean, reason?: string) {
    const org = snapshot.organizations.find((o) => o.id === organizationId)
    if (!org) return
    org.verificationStatus = approve ? "verified" : "rejected"
    org.verifiedBy = approve ? "adm-001" : undefined
    org.verifiedAt = approve ? new Date().toISOString() : undefined
    org.rejectionReason = approve ? undefined : reason
    const bank = snapshot.bankAccounts.find((b) => b.organizationId === organizationId)
    if (bank) {
      bank.verificationStatus = approve ? "verified" : "rejected"
    }
    db.raw.auditLogs.unshift({
      id: `aud-live-${snapshot.auditLogs.length + 1}`,
      actorType: "admin",
      actorName: "Sekar Ayu Larasati",
      action: approve ? "organization.verify" : "organization.reject",
      entityType: "organizations",
      entityId: organizationId,
      after: { verification_status: org.verificationStatus, rejection_reason: reason },
      ipAddress: "10.20.11.4",
      createdAt: new Date().toISOString(),
    })
    commit()
  },

  reviewEvent(eventId: string, approve: boolean) {
    const event = db.eventById(eventId)
    if (!event) return
    event.status = approve ? "published" : "draft"
    event.reviewedBy = approve ? "adm-001" : undefined
    event.publishedAt = approve ? new Date().toISOString() : undefined
    db.raw.auditLogs.unshift({
      id: `aud-live-${snapshot.auditLogs.length + 1}`,
      actorType: "admin",
      actorName: "Sekar Ayu Larasati",
      action: approve ? "event.publish" : "event.request_revision",
      entityType: "events",
      entityId: eventId,
      after: { status: event.status },
      ipAddress: "10.20.11.4",
      createdAt: new Date().toISOString(),
    })
    commit()
  },

  setEventStatus(eventId: string, status: Event["status"]) {
    const event = db.eventById(eventId)
    if (!event) return
    event.status = status
    commit()
  },

  addExternalEvent(input: {
    title: string
    province: string
    city: string
    locationName: string
    externalUrl: string
    eventStartAt: string
  }) {
    const slug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-")
    const event: Event = {
      id: `evt-ext-${snapshot.events.length + 1}`,
      organizationId: null,
      eventType: "external",
      title: input.title,
      slug,
      description:
        "Event diselenggarakan pihak ketiga dan dicatat oleh admin platform pada kalender discovery. Pendaftaran ditangani langsung oleh penyelenggara.",
      locationName: input.locationName,
      province: input.province,
      city: input.city,
      latitude: 0,
      longitude: 0,
      eventStartAt: input.eventStartAt,
      eventEndAt: input.eventStartAt,
      registrationOpenAt: null,
      registrationCloseAt: null,
      status: "published",
      externalUrl: input.externalUrl,
      coverUrl: "",
      mandatoryGear: [],
      terms: "Informasi lengkap mengikuti halaman resmi penyelenggara.",
      isFeatured: false,
      createdAt: new Date().toISOString(),
      categories: [],
      requirements: [],
      formFields: [],
      routeProfile: [],
      organizerName: "Event eksternal",
      organizerVerified: true,
      participantCount: 0,
      sourceUpdatedAt: new Date().toISOString(),
    }
    db.raw.events.push(event)
    commit()
    return event
  },

  reviewDisbursement(disbursementId: string, approve: boolean) {
    const disbursement = snapshot.disbursements.find((d) => d.id === disbursementId)
    if (!disbursement) return
    const status: Disbursement["status"] = approve ? "paid" : "held"
    disbursement.status = status
    disbursement.approvedBy = approve ? "adm-003" : undefined
    disbursement.approvedAt = approve ? new Date().toISOString() : undefined
    disbursement.paidAt = approve ? new Date().toISOString() : undefined
    disbursement.payoutRef = approve ? `PO-${Math.floor(Math.random() * 900000 + 100000)}` : undefined
    disbursement.conditions.forEach((condition) => {
      condition.isMet = condition.isMet || approve
      condition.checkedBy = condition.checkedBy ?? (approve ? "adm-003" : undefined)
      condition.checkedAt = condition.checkedAt ?? (approve ? new Date().toISOString() : undefined)
    })
    db.raw.auditLogs.unshift({
      id: `aud-live-${snapshot.auditLogs.length + 1}`,
      actorType: "admin",
      actorName: "Wulan Damayanti",
      action: approve ? "disbursement.approve" : "disbursement.hold",
      entityType: "disbursements",
      entityId: disbursementId,
      before: { status: "eligible" },
      after: { status, amount: disbursement.amount },
      ipAddress: "10.20.11.9",
      createdAt: new Date().toISOString(),
    })
    commit()
  },

  resolveDispute(disputeId: string, resolution: string) {
    const dispute = snapshot.disputes.find((d) => d.id === disputeId)
    if (!dispute) return
    dispute.status = "resolved"
    dispute.handledBy = "adm-002"
    dispute.resolution = resolution
    dispute.resolvedAt = new Date().toISOString()
    commit()
  },

  advanceDispute(disputeId: string) {
    const dispute = snapshot.disputes.find((d) => d.id === disputeId)
    if (!dispute) return
    dispute.status = "in_review"
    dispute.handledBy = "adm-002"
    commit()
  },

  markNotificationsRead(userId: string) {
    snapshot.notifications
      .filter((n) => n.recipientId === userId && !n.readAt)
      .forEach((n) => {
        n.readAt = new Date().toISOString()
      })
    commit()
  },

  markNotificationRead(notificationId: string) {
    const notification = snapshot.notifications.find((n) => n.id === notificationId)
    if (!notification) return
    notification.readAt = new Date().toISOString()
    commit()
  },

  sendBroadcast(eventId: string, subject: string, message: string, channel: "email" | "whatsapp") {
    const event = db.eventById(eventId)
    const recipients = snapshot.registrations.filter(
      (r) => r.eventId === eventId && ["paid", "checked_in"].includes(r.status),
    )
    db.raw.broadcasts.unshift({
      id: `brd-live-${snapshot.broadcasts.length + 1}`,
      eventId,
      sentBy: "Race Director",
      channel,
      subject,
      message,
      recipients: recipients.length,
      sentAt: new Date().toISOString(),
    })
    recipients.forEach((registration) => {
      db.raw.notifications.unshift({
        id: `ntf-brd-${registration.id}-${Date.now()}`,
        recipientType: "attendee",
        recipientId: registration.userId,
        channel: channel === "whatsapp" ? "whatsapp" : "email",
        templateKey: "broadcast.custom",
        title: subject,
        body: message,
        status: "sent",
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    })
    commit()
    void event
    return recipients.length
  },

  updateOrganization(organizationId: string, patch: Partial<Organization>) {
    const org = snapshot.organizations.find((o) => o.id === organizationId)
    if (!org) return
    Object.assign(org, patch)
    commit()
  },

  updateEvent(eventId: string, patch: Partial<Event>) {
    const event = db.eventById(eventId)
    if (!event) return
    Object.assign(event, patch)
    commit()
  },

  unlockBankAccount(organizationId: string) {
    const bank = snapshot.bankAccounts.find((b) => b.organizationId === organizationId)
    if (!bank) return
    bank.verificationStatus = "pending"
    commit()
  },

  resetDemoData() {
    database = buildDatabase()
    commit()
  },
}

export type DemoActions = typeof actions
