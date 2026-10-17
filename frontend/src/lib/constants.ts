import type {
  Difficulty,
  EventStatus,
  PaymentStatus,
  RegistrationStatus,
  VerificationStatus,
  DisbursementStatus,
  QualificationRequirementType,
  FormFieldType,
  OrgRole,
  AdminRole,
} from "@/types"

export const APP_NAME = "Jejak Trail"

export const PROVINCES = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Jambi",
  "Sumatera Selatan",
  "Bengkulu",
  "Lampung",
  "Bangka Belitung",
  "Kepulauan Riau",
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Banten",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Sulawesi Tengah",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Gorontalo",
  "Sulawesi Barat",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
] as const

export const JERSEY_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const

export const BANKS = [
  "BCA",
  "Mandiri",
  "BNI",
  "BRI",
  "CIMB Niaga",
  "Permata",
  "BSI",
  "Bank Jago",
] as const

export const DISTANCE_BUCKETS = [
  { value: "0-15", label: "≤ 15 km" },
  { value: "15-30", label: "15 – 30 km" },
  { value: "30-50", label: "30 – 50 km" },
  { value: "50-100", label: "50 – 100 km" },
  { value: "100+", label: "> 100 km" },
] as const

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Mudah",
  moderate: "Menengah",
  hard: "Sulit",
  extreme: "Ekstrem",
}

export const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  easy: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  moderate: "text-sky-300 border-sky-400/30 bg-sky-400/10",
  hard: "text-amber-300 border-amber-400/30 bg-amber-400/10",
  extreme: "text-rose-300 border-rose-400/30 bg-rose-400/10",
}

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending_verification: "Menunggu verifikasi",
  approved: "Disetujui",
  awaiting_payment: "Menunggu pembayaran",
  paid: "Lunas",
  rejected: "Ditolak",
  expired: "Kedaluwarsa",
  waitlisted: "Daftar tunggu",
  cancelled: "Dibatalkan",
  refunded: "Dana dikembalikan",
  checked_in: "Racepack diambil",
}

export const REGISTRATION_STATUS_CLASS: Record<RegistrationStatus, string> = {
  pending_verification: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  approved: "text-sky-300 border-sky-400/40 bg-sky-400/10",
  awaiting_payment: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  paid: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
  rejected: "text-rose-300 border-rose-400/40 bg-rose-400/10",
  expired: "text-slate-300 border-slate-400/40 bg-slate-400/10",
  waitlisted: "text-violet-300 border-violet-400/40 bg-violet-400/10",
  cancelled: "text-slate-300 border-slate-400/40 bg-slate-400/10",
  refunded: "text-orange-300 border-orange-400/40 bg-orange-400/10",
  checked_in: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Draf",
  pending_review: "Menunggu review",
  published: "Tayang",
  registration_closed: "Pendaftaran ditutup",
  cancelled: "Dibatalkan",
  completed: "Selesai",
  suspended: "Ditangguhkan",
}

export const EVENT_STATUS_CLASS: Record<EventStatus, string> = {
  draft: "text-slate-300 border-slate-400/40 bg-slate-400/10",
  pending_review: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  published: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
  registration_closed: "text-sky-300 border-sky-400/40 bg-sky-400/10",
  cancelled: "text-rose-300 border-rose-400/40 bg-rose-400/10",
  completed: "text-emerald-200 border-emerald-400/40 bg-emerald-400/10",
  suspended: "text-orange-300 border-orange-400/40 bg-orange-400/10",
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Menunggu",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  failed: "Gagal",
  refunded: "Dikembalikan",
  partially_refunded: "Dikembalikan sebagian",
}

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  pending: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
}

export const DISBURSEMENT_STATUS_LABEL: Record<DisbursementStatus, string> = {
  pending: "Menunggu",
  eligible: "Memenuhi syarat",
  approved: "Disetujui",
  paid: "Sudah dicairkan",
  held: "Ditahan",
  rejected: "Ditolak",
}

export const REQUIREMENT_TYPE_LABEL: Record<
  QualificationRequirementType,
  string
> = {
  finisher_certificate: "Sertifikat finisher",
  race_result_link: "Tautan hasil lomba",
  profile_link: "Tautan profil pelari",
  medical_certificate: "Surat keterangan sehat",
  custom_text: "Isian bebas",
}

export const FORM_FIELD_TYPE_LABEL: Record<FormFieldType, string> = {
  text: "Teks",
  number: "Angka",
  select: "Pilihan",
  date: "Tanggal",
  file: "Berkas",
  textarea: "Teks panjang",
  checkbox: "Centang",
}

export const ORG_ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Owner",
  verifier: "Staf verifikasi",
  racepack_staff: "Staf racepack",
  finance: "Staf keuangan",
}

export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  support: "Support",
  finance: "Finance",
}

export const DISPUTE_TYPE_LABEL: Record<string, string> = {
  payment: "Pembayaran",
  rejection: "Penolakan pendaftaran",
  event_cancelled: "Event dibatalkan",
  refund: "Refund",
  organizer_fraud: "Dugaan kecurangan organizer",
  other: "Lainnya",
}

export const REFUND_REASON_LABEL: Record<string, string> = {
  event_cancelled: "Event dibatalkan",
  participant_cancel: "Peserta membatalkan",
  payment_error: "Kesalahan pembayaran",
  overbooked: "Kuota terlampaui",
  other: "Lainnya",
}

/** Aksi berikutnya yang masuk akal untuk sebuah status pendaftaran. */
export const REGISTRATION_NEXT_ACTIONS: Partial<
  Record<RegistrationStatus, string[]>
> = {
  awaiting_payment: ["Bayar sekarang"],
  pending_verification: ["Menunggu keputusan penyelenggara"],
  rejected: ["Ajukan ulang"],
  waitlisted: ["Menunggu slot tersedia"],
  paid: ["Lihat tiket"],
  checked_in: ["Lihat tiket"],
}

export const NAV_PUBLIC = [
  { href: "/", label: "Beranda" },
  { href: "/events", label: "Event" },
  { href: "/kalender", label: "Kalender" },
  { href: "/tentang", label: "Tentang" },
]

export const CURRENCY = "IDR"

export const LIST_PAGE_SIZE = 8
