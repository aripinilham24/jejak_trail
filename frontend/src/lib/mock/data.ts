import type {
  AdminUser,
  AdminStats,
  AuditLog,
  Broadcast,
  Disbursement,
  Dispute,
  Event,
  EventCategory,
  EventRoutePoint,
  Notification,
  Organization,
  OrganizationBankAccount,
  OrganizerAccount,
  OrganizerStats,
  Payment,
  RacepackCheckin,
  Refund,
  RefundPolicy,
  Registration,
  RegistrationFormField,
  RegistrationStatusLog,
  Ticket,
  User,
} from "@/types"

/* ------------------------------------------------------------------ */
/* Utils                                                              */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)] as T
}

function intBetween(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

const DAY = 86_400_000

/** Tanggal relatif terhadap "sekarang" supaya data demo selalu relevan. */
function shiftDays(days: number, hour = 6): string {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setTime(d.getTime() + days * DAY)
  return d.toISOString()
}

/* ------------------------------------------------------------------ */
/* Blueprint data                                                     */
/* ------------------------------------------------------------------ */

interface EventSeed {
  title: string
  province: string
  city: string
  location: string
  type: "native" | "external"
  status: Event["status"]
  startInDays: number
  org: string | null
  featured?: boolean
  externalUrl?: string
  categories: {
    name: string
    km: number
    gain: number
    price: number
    quota: number
    cutoff: number
    qualification: boolean
  }[]
}

const ORGANIZATION_SEEDS: {
  name: string
  orgType: Organization["orgType"]
  province: string
  city: string
  status: Organization["verificationStatus"]
  since: number
}[] = [
  { name: "Jejak Nusantara Events", orgType: "event_organizer", province: "Jawa Barat", city: "Bandung", status: "verified", since: -820 },
  { name: "Trail Runners Indonesia", orgType: "community", province: "DI Yogyakarta", city: "Sleman", status: "verified", since: -1040 },
  { name: "Rimba Run Organizer", orgType: "event_organizer", province: "Jawa Timur", city: "Malang", status: "verified", since: -560 },
  { name: "Sumatra Ultra Crew", orgType: "community", province: "Sumatera Barat", city: "Padang", status: "verified", since: -430 },
  { name: "Bali Trail Collective", orgType: "event_organizer", province: "Bali", city: "Tabanan", status: "verified", since: -300 },
  { name: "Sulawesi Highland Race", orgType: "event_organizer", province: "Sulawesi Selatan", city: "Toraja", status: "pending", since: -22 },
  { name: "Kalimantan Forest Run", orgType: "community", province: "Kalimantan Timur", city: "Balikpapan", status: "pending", since: -9 },
  { name: "Nusa Tenggara Endurance", orgType: "event_organizer", province: "Nusa Tenggara Timur", city: "Kupang", status: "verified", since: -700 },
  { name: "Papua Sky Trail", orgType: "event_organizer", province: "Papua", city: "Wamena", status: "rejected", since: -60 },
  { name: "Lampung Hill Runners", orgType: "community", province: "Lampung", city: "Bandar Lampung", status: "verified", since: -380 },
]

const EVENT_SEEDS: EventSeed[] = [
  {
    title: "Sundoro Trail Challenge",
    province: "Jawa Tengah",
    city: "Wonosobo",
    location: "Basecamp Sundoro, Wonosobo",
    type: "native",
    status: "published",
    startInDays: 46,
    org: "Jejak Nusantara Events",
    featured: true,
    categories: [
      { name: "11K Rookie", km: 11, gain: 640, price: 250000, quota: 300, cutoff: 240, qualification: false },
      { name: "24K Ridge", km: 24, gain: 1480, price: 450000, quota: 220, cutoff: 480, qualification: true },
      { name: "42K Skyline", km: 42, gain: 2650, price: 750000, quota: 120, cutoff: 780, qualification: true },
    ],
  },
  {
    title: "Merbabu Vertical Race",
    province: "Jawa Tengah",
    city: "Magelang",
    location: "Desa Suwanting, Magelang",
    type: "native",
    status: "published",
    startInDays: 74,
    org: "Trail Runners Indonesia",
    featured: true,
    categories: [
      { name: "Vertical 9K", km: 9, gain: 1200, price: 300000, quota: 250, cutoff: 300, qualification: false },
      { name: "21K Highland", km: 21, gain: 1900, price: 525000, quota: 180, cutoff: 450, qualification: true },
    ],
  },
  {
    title: "Rinjani Ultra 100",
    province: "Nusa Tenggara Barat",
    city: "Lombok Timur",
    location: "Sembalun, Lombok Timur",
    type: "native",
    status: "published",
    startInDays: 128,
    org: "Nusa Tenggara Endurance",
    featured: true,
    categories: [
      { name: "27K Rinjani Rim", km: 27, gain: 2100, price: 650000, quota: 200, cutoff: 540, qualification: true },
      { name: "55K Crater", km: 55, gain: 3900, price: 1150000, quota: 120, cutoff: 900, qualification: true },
      { name: "100K Ultra", km: 100, gain: 6200, price: 1850000, quota: 60, cutoff: 1800, qualification: true },
    ],
  },
  {
    title: "Bromo Tengger Trail",
    province: "Jawa Timur",
    city: "Probolinggo",
    location: "Cemoro Lawang, Probolinggo",
    type: "native",
    status: "published",
    startInDays: 21,
    org: "Rimba Run Organizer",
    categories: [
      { name: "15K Sand Sea", km: 15, gain: 780, price: 350000, quota: 400, cutoff: 300, qualification: false },
      { name: "36K Tengger", km: 36, gain: 1850, price: 650000, quota: 200, cutoff: 600, qualification: true },
    ],
  },
  {
    title: "Merapi Sundown Run",
    province: "DI Yogyakarta",
    city: "Sleman",
    location: "Kaliurang, Sleman",
    type: "native",
    status: "registration_closed",
    startInDays: 6,
    org: "Trail Runners Indonesia",
    categories: [
      { name: "10K Twilight", km: 10, gain: 520, price: 200000, quota: 350, cutoff: 210, qualification: false },
      { name: "25K Night Trail", km: 25, gain: 1350, price: 425000, quota: 150, cutoff: 480, qualification: true },
    ],
  },
  {
    title: "Batur Caldera Sky Run",
    province: "Bali",
    city: "Bangli",
    location: "Kintamani, Bangli",
    type: "native",
    status: "published",
    startInDays: 92,
    org: "Bali Trail Collective",
    categories: [
      { name: "14K Caldera", km: 14, gain: 900, price: 375000, quota: 260, cutoff: 300, qualification: false },
      { name: "30K Batur", km: 30, gain: 2050, price: 700000, quota: 160, cutoff: 540, qualification: true },
    ],
  },
  {
    title: "Singgalang Ridge Marathon",
    province: "Sumatera Barat",
    city: "Padang Panjang",
    location: "Nagari Pandai Sikek",
    type: "native",
    status: "published",
    startInDays: 58,
    org: "Sumatra Ultra Crew",
    categories: [
      { name: "18K Singgalang", km: 18, gain: 1150, price: 400000, quota: 200, cutoff: 360, qualification: false },
      { name: "46K Ridge Marathon", km: 46, gain: 3200, price: 850000, quota: 100, cutoff: 840, qualification: true },
    ],
  },
  {
    title: "Tangkuban Perahu Hill Climb",
    province: "Jawa Barat",
    city: "Subang",
    location: "Kawasan Tangkuban Perahu",
    type: "native",
    status: "published",
    startInDays: 33,
    org: "Lampung Hill Runners",
    categories: [
      { name: "12K Crater Walk", km: 12, gain: 700, price: 275000, quota: 300, cutoff: 240, qualification: false },
      { name: "28K Rim Trail", km: 28, gain: 1750, price: 525000, quota: 180, cutoff: 520, qualification: true },
    ],
  },
  {
    title: "Toba Highland Ultra",
    province: "Sumatera Utara",
    city: "Samosir",
    location: "Pulau Samosir, Danau Toba",
    type: "native",
    status: "pending_review",
    startInDays: 150,
    org: "Sumatra Ultra Crew",
    categories: [
      { name: "25K Lakeside", km: 25, gain: 1100, price: 500000, quota: 200, cutoff: 480, qualification: true },
      { name: "62K Highland", km: 62, gain: 3400, price: 1250000, quota: 90, cutoff: 1020, qualification: true },
    ],
  },
  {
    title: "Toraja Highland Skyrace",
    province: "Sulawesi Selatan",
    city: "Toraja",
    location: "Rantepao, Toraja Utara",
    type: "native",
    status: "draft",
    startInDays: 175,
    org: "Sulawesi Highland Race",
    categories: [
      { name: "20K Toraja", km: 20, gain: 1400, price: 450000, quota: 150, cutoff: 420, qualification: true },
    ],
  },
  {
    title: "Ijen Blue Fire Night Race",
    province: "Jawa Timur",
    city: "Banyuwangi",
    location: "Paltuding, Banyuwangi",
    type: "native",
    status: "published",
    startInDays: 15,
    org: "Rimba Run Organizer",
    categories: [
      { name: "16K Blue Fire", km: 16, gain: 1050, price: 375000, quota: 220, cutoff: 360, qualification: false },
      { name: "34K Ijen Rim", km: 34, gain: 2300, price: 675000, quota: 110, cutoff: 660, qualification: true },
    ],
  },
  {
    title: "Komodo Coastal Trail",
    province: "Nusa Tenggara Timur",
    city: "Labuan Bajo",
    location: "Labuan Bajo, Manggarai Barat",
    type: "external",
    status: "published",
    startInDays: 66,
    org: null,
    externalUrl: "https://example.com/komodo-coastal-trail",
    categories: [],
  },
  {
    title: "Bukit Lawang Jungle Trail",
    province: "Sumatera Utara",
    city: "Langkat",
    location: "Bukit Lawang",
    type: "external",
    status: "published",
    startInDays: 40,
    org: null,
    externalUrl: "https://example.com/bukit-lawang-jungle",
    categories: [],
  },
  {
    title: "Wakatobi Ocean Trail",
    province: "Sulawesi Tenggara",
    city: "Wakatobi",
    location: "Wangi-Wangi, Wakatobi",
    type: "external",
    status: "published",
    startInDays: 110,
    org: null,
    externalUrl: "https://example.com/wakatobi-ocean-trail",
    categories: [],
  },
  {
    title: "Danau Tondano Trail Fest",
    province: "Sulawesi Utara",
    city: "Minahasa",
    location: "Tondano, Minahasa",
    type: "external",
    status: "published",
    startInDays: 85,
    org: null,
    externalUrl: "https://example.com/tondano-trail-fest",
    categories: [],
  },
  {
    title: "Sentul Forest Loop",
    province: "Jawa Barat",
    city: "Bogor",
    location: "Sentul, Bogor",
    type: "native",
    status: "completed",
    startInDays: -24,
    org: "Lampung Hill Runners",
    categories: [
      { name: "10K Loop", km: 10, gain: 460, price: 200000, quota: 250, cutoff: 200, qualification: false },
      { name: "23K Forest", km: 23, gain: 1250, price: 400000, quota: 130, cutoff: 480, qualification: true },
    ],
  },
  {
    title: "Papandayan Ground Zero",
    province: "Jawa Barat",
    city: "Garut",
    location: "Cisurupan, Garut",
    type: "native",
    status: "cancelled",
    startInDays: 52,
    org: "Jejak Nusantara Events",
    categories: [
      { name: "17K Papandayan", km: 17, gain: 1200, price: 425000, quota: 180, cutoff: 420, qualification: true },
    ],
  },
]

const FIRST_NAMES = [
  "Rani", "Bagas", "Sinta", "Aditya", "Nadia", "Fajar", "Maya", "Reza", "Intan",
  "Yoga", "Dewi", "Hendra", "Laras", "Arif", "Citra", "Bimo", "Sari", "Dimas",
  "Putri", "Galih", "Anisa", "Wisnu", "Tari", "Eko", "Ayu", "Rangga", "Melati",
  "Bayu", "Kirana", "Alif", "Nabila", "Fikri", "Sabrina", "Dani", "Ratna",
]

const LAST_NAMES = [
  "Puspita", "Nugroho", "Hidayat", "Pratama", "Wijaya", "Santoso", "Kusuma",
  "Ramadhan", "Safitri", "Mahendra", "Wulandari", "Setiawan", "Anggraini",
  "Firmansyah", "Lestari", "Hartono", "Saputra", "Oktaviani", "Prasetyo",
]

const CITIES_BY_PROVINCE: Record<string, string[]> = {
  "Jawa Barat": ["Bandung", "Bogor", "Garut", "Subang", "Cimahi"],
  "Jawa Tengah": ["Wonosobo", "Magelang", "Semarang", "Boyolali"],
  "Jawa Timur": ["Malang", "Probolinggo", "Banyuwangi", "Batu"],
  "DI Yogyakarta": ["Sleman", "Bantul", "Kulon Progo"],
  Bali: ["Denpasar", "Tabanan", "Bangli", "Karangasem"],
  "Sumatera Barat": ["Padang", "Bukittinggi", "Padang Panjang"],
  "Sumatera Utara": ["Medan", "Berastagi", "Samosir"],
  "Nusa Tenggara Barat": ["Mataram", "Lombok Timur"],
  "Nusa Tenggara Timur": ["Kupang", "Labuan Bajo"],
  Jakarta: ["Jakarta Selatan", "Jakarta Pusat"],
  Lampung: ["Bandar Lampung", "Lampung Barat"],
}

/* ------------------------------------------------------------------ */
/* Builders                                                           */
/* ------------------------------------------------------------------ */

function buildRouteProfile(rand: () => number, km: number, gain: number): EventRoutePoint[] {
  const steps = Math.max(24, Math.min(70, Math.round(km * 2.6)))
  const points: EventRoutePoint[] = []
  let elevation = intBetween(rand, 380, 900)
  const base = elevation
  const peak = base + gain * 0.72
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const wave =
      Math.sin(t * Math.PI * 2.4 + rand() * 0.4) * gain * 0.18 +
      Math.sin(t * Math.PI * 6.1) * gain * 0.07
    const climb = Math.sin(t * Math.PI) * (peak - base)
    elevation = Math.round(base + climb + wave + rand() * gain * 0.04)
    points.push({ km: Number(((t * km).toFixed(2))), elevation })
  }
  return points
}

function buildRefundPolicy(seedHash: number, orgId: string, orgName: string): RefundPolicy {
  const rand = mulberry32(seedHash)
  const tiered = rand() > 0.25
  const policyId = `rp-${orgId}`
  if (!tiered) {
    return {
      id: policyId,
      organizationId: orgId,
      name: `Kebijakan non-refund ${orgName}`,
      policyType: "no_refund",
      description:
        "Biaya pendaftaran tidak dapat dikembalikan, kecuali event dibatalkan oleh penyelenggara.",
      version: 2,
      createdAt: shiftDays(-120),
      rules: [],
    }
  }
  return {
    id: policyId,
    organizationId: orgId,
    name: `Kebijakan refund bertingkat ${orgName}`,
    policyType: "tiered",
    description:
      "Refund mengikuti jarak hari menuju hari event. Persentase dihitung dari harga kategori.",
    version: 3,
    createdAt: shiftDays(-95),
    rules: [
      { id: `${policyId}-r1`, policyId, daysBeforeEventMin: 30, daysBeforeEventMax: null, refundPercent: 70 },
      { id: `${policyId}-r2`, policyId, daysBeforeEventMin: 14, daysBeforeEventMax: 29, refundPercent: 50 },
      { id: `${policyId}-r3`, policyId, daysBeforeEventMin: 7, daysBeforeEventMax: 13, refundPercent: 25 },
      { id: `${policyId}-r4`, policyId, daysBeforeEventMin: 0, daysBeforeEventMax: 6, refundPercent: 0 },
    ],
  }
}

export function buildDatabase() {
  const users: User[] = []
  const organizations: Organization[] = []
  const organizerAccounts: OrganizerAccount[] = []
  const bankAccounts: OrganizationBankAccount[] = []
  const adminUsers: AdminUser[] = []
  const events: Event[] = []
  const refundPolicies: RefundPolicy[] = []
  const registrations: Registration[] = []
  const payments: Payment[] = []
  const tickets: Ticket[] = []
  const checkins: RacepackCheckin[] = []
  const disbursements: Disbursement[] = []
  const disputes: Dispute[] = []
  const broadcasts: Broadcast[] = []
  const notifications: Notification[] = []
  const auditLogs: AuditLog[] = []
  const refunds: Refund[] = []

  /* --- Admin --- */
  adminUsers.push(
    {
      id: "adm-001",
      email: "admin@jejakTrail.id",
      fullName: "Sekar Ayu Larasati",
      adminRole: "super_admin",
      twoFactorEnabled: true,
      status: "active",
      createdAt: shiftDays(-900),
    },
    {
      id: "adm-002",
      email: "support@jejakTrail.id",
      fullName: "Bramantyo Adi",
      adminRole: "support",
      twoFactorEnabled: true,
      status: "active",
      createdAt: shiftDays(-520),
    },
    {
      id: "adm-003",
      email: "finance@jejakTrail.id",
      fullName: "Wulan Damayanti",
      adminRole: "finance",
      twoFactorEnabled: false,
      status: "active",
      createdAt: shiftDays(-410),
    },
  )

  /* --- Organisasi --- */
  ORGANIZATION_SEEDS.forEach((seed, index) => {
    const id = `org-${String(index + 1).padStart(3, "0")}`
    const rand = mulberry32(hash(seed.name))
    const province = seed.province
    organizations.push({
      id,
      name: seed.name,
      orgType: seed.orgType,
      officialEmail: `halo@${seed.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.id`,
      phone: `08${intBetween(rand, 11, 99)}${intBetween(rand, 1000000, 9999999)}`,
      address: `Jl. ${pick(rand, ["Merdeka", "Diponegoro", "Sudirman", "Raya Trail", "Cendana"])} No. ${intBetween(rand, 1, 120)}, ${seed.city}`,
      province,
      city: seed.city,
      legalDocUrl: `https://docs.jejakTrail.id/legalitas/${id}.pdf`,
      verificationStatus: seed.status,
      verifiedBy: seed.status === "verified" ? "adm-001" : undefined,
      verifiedAt: seed.status === "verified" ? shiftDays(seed.since + 4, 9) : undefined,
      rejectionReason:
        seed.status === "rejected"
          ? "Dokumen legalitas tidak sesuai dengan nama organisasi pada rekening."
          : undefined,
      status: seed.status === "rejected" ? "active" : "active",
      createdAt: shiftDays(seed.since),
      eventCount: 0,
      logoSeed: String(hash(seed.name) % 360),
    })

    const ownerNames = ["Rangga Prasetyo", "Nadia Safitri", "Wisnu Mahendra", "Intan Lestari", "Yoga Hartono"]
    const roles: OrganizerAccount["orgRole"][] = ["owner", "verifier", "racepack_staff", "finance"]
    const ownerName = ownerNames[index % ownerNames.length] as string
    organizerAccounts.push({
      id: `oa-${id}-owner`,
      organizationId: id,
      email: `owner@${id}.id`,
      fullName: ownerName,
      phone: `08${intBetween(rand, 11, 99)}${intBetween(rand, 1000000, 9999999)}`,
      positionTitle: "Race Director",
      orgRole: "owner",
      twoFactorEnabled: true,
      status: "active",
      createdAt: shiftDays(seed.since + 1),
    })
    for (let i = 1; i <= 3; i += 1) {
      const role = roles[i] as OrganizerAccount["orgRole"]
      organizerAccounts.push({
        id: `oa-${id}-${role}`,
        organizationId: id,
        email: `${role}@${id}.id`,
        fullName: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
        phone: `08${intBetween(rand, 11, 99)}${intBetween(rand, 1000000, 9999999)}`,
        positionTitle:
          role === "verifier" ? "Verifikator Pendaftaran" : role === "racepack_staff" ? "Koordinator Racepack" : "Staf Keuangan",
        orgRole: role,
        twoFactorEnabled: role === "finance",
        status: role === "verifier" ? "active" : "invited",
        invitedAt: shiftDays(seed.since + 12),
        createdAt: shiftDays(seed.since + 12),
      })
    }

    bankAccounts.push({
      id: `bank-${id}`,
      organizationId: id,
      bankName: pick(rand, ["BCA", "Mandiri", "BNI", "BRI", "BSI"]),
      accountNumberMasked: `**** **** ${intBetween(rand, 1000, 9999)}`,
      accountHolder: seed.name,
      verificationStatus: seed.status === "verified" ? "verified" : "pending",
      isActive: true,
    })

    refundPolicies.push(buildRefundPolicy(hash(seed.name), id, seed.name))
  })

  const orgByName = new Map(organizations.map((o) => [o.name, o]))

  /* --- Event --- */
  EVENT_SEEDS.forEach((seed, index) => {
    const rand = mulberry32(hash(seed.title))
    const org = seed.org ? orgByName.get(seed.org) : undefined
    const orgId = org?.id ?? null
    const id = `evt-${String(index + 1).padStart(3, "0")}`
    const slug = seed.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-")

    const categories: EventCategory[] = seed.categories.map((c, ci) => ({
      id: `${id}-cat-${ci + 1}`,
      eventId: id,
      name: c.name,
      distanceKm: c.km,
      elevationGainM: c.gain,
      difficulty: c.km >= 45 ? "extreme" : c.gain / c.km > 55 ? "hard" : c.gain / c.km > 32 ? "moderate" : "easy",
      price: c.price,
      quota: c.quota,
      minAge: c.km >= 42 ? 20 : 17,
      cutoffMinutes: c.cutoff,
      requiresQualification: c.qualification,
      bibPrefix: c.name.split(" ")[0]?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) ?? "TRL",
      bibNext: intBetween(rand, 40, 190),
    }))

    const requirements: Event["requirements"] = []
    categories.forEach((cat) => {
      if (!cat.requiresQualification) return
      requirements.push(
        {
          id: `${cat.id}-req-1`,
          categoryId: cat.id,
          requirementType: "finisher_certificate",
          label: "Sertifikat finisher jarak serupa",
          description:
            "Unggah sertifikat finisher event trail minimal 70% dari jarak kategori ini dalam 24 bulan terakhir.",
          isRequired: true,
          sortOrder: 1,
        },
        {
          id: `${cat.id}-req-2`,
          categoryId: cat.id,
          requirementType: "medical_certificate",
          label: "Surat keterangan sehat",
          description:
            "Surat keterangan sehat dari dokter, maksimal 6 bulan sebelum hari event.",
          isRequired: true,
          sortOrder: 2,
        },
        {
          id: `${cat.id}-req-3`,
          categoryId: cat.id,
          requirementType: "profile_link",
          label: "Tautan profil pelari",
          description: "Tautan Strava, ITRA, atau UTMB index Anda.",
          isRequired: false,
          sortOrder: 3,
        },
      )
    })

    const formFields: RegistrationFormField[] = [
      { id: `${id}-f1`, eventId: id, fieldKey: "jersey_size", label: "Ukuran jersey", fieldType: "select", options: ["XS", "S", "M", "L", "XL", "XXL"], isRequired: true, isSensitive: false, sortOrder: 1 },
      { id: `${id}-f2`, eventId: id, fieldKey: "emergency_contact_name", label: "Nama kontak darurat", fieldType: "text", isRequired: true, isSensitive: true, sortOrder: 2 },
      { id: `${id}-f3`, eventId: id, fieldKey: "emergency_contact_phone", label: "Nomor kontak darurat", fieldType: "text", isRequired: true, isSensitive: true, sortOrder: 3 },
      { id: `${id}-f4`, eventId: id, fieldKey: "blood_type", label: "Golongan darah", fieldType: "select", options: ["A", "B", "AB", "O", "Tidak tahu"], isRequired: false, isSensitive: true, sortOrder: 4 },
      { id: `${id}-f5`, eventId: id, fieldKey: "club", label: "Komunitas / klub", fieldType: "text", isRequired: false, isSensitive: false, sortOrder: 5 },
      { id: `${id}-f6`, eventId: id, fieldKey: "medical_notes", label: "Riwayat penyakit / alergi", fieldType: "textarea", isRequired: false, isSensitive: true, sortOrder: 6 },
      { id: `${id}-f7`, eventId: id, fieldKey: "shuttle_needed", label: "Butuh shuttle dari basecamp?", fieldType: "checkbox", isRequired: false, isSensitive: false, sortOrder: 7 },
    ]

    const refundPolicy = orgId ? refundPolicies.find((p) => p.organizationId === orgId) : undefined
    const startAt = seed.startInDays
    const isNative = seed.type === "native"

    events.push({
      id,
      organizationId: orgId,
      reviewedBy: seed.status === "published" ? "adm-001" : undefined,
      eventType: seed.type,
      title: seed.title,
      slug,
      description: isNative
        ? `${seed.title} melewati jalur ${seed.location}. Lintasan disusun untuk memberi pengalaman trail run lengkap: tanjakan teknis, punggungan terbuka, dan turunan cepat yang tetap menuntut kendali. Setiap kategori memiliki cut-off dan kuota sendiri, dengan pos air, pos medis, dan sweeper di sepanjang rute.`
        : `${seed.title} adalah event yang diselenggarakan oleh pihak ketiga. Jejak Trail mencatatnya di kalender discovery; pendaftaran, pembayaran, dan informasi lengkap ditangani langsung oleh penyelenggara melalui website resmi mereka.`,
      locationName: seed.location,
      province: seed.province,
      city: seed.city,
      latitude: -6.5 + rand() * 2,
      longitude: 106 + rand() * 8,
      eventStartAt: shiftDays(startAt, 5),
      eventEndAt: shiftDays(startAt + (isNative ? 1 : 0), 18),
      registrationOpenAt: isNative ? shiftDays(startAt - 120, 8) : null,
      registrationCloseAt: isNative ? shiftDays(startAt - 3, 23) : null,
      status: seed.status,
      externalUrl: seed.externalUrl,
      coverUrl: "",
      routeGpxUrl: isNative ? `https://docs.jejakTrail.id/gpx/${slug}.gpx` : undefined,
      mandatoryGear: isNative
        ? [
            "Hydration 1,5 L minimum",
            "Jas hujan / windbreaker",
            "Whistle",
            "Emergency blanket",
            "Headlamp (untuk kategori malam)",
            "Uang tunai darurat",
            "Telepon dengan daya cukup",
          ]
        : [],
      terms:
        "Peserta wajib mengambil racepack pada jadwal yang ditentukan, membawa kartu identitas, dan menyetujui kebijakan refund event. Nomor BIB bersifat personal dan tidak dapat dialihkan.",
      isFeatured: Boolean(seed.featured),
      refundPolicyId: refundPolicy?.id,
      publishedAt: seed.status === "published" || seed.status === "registration_closed" || seed.status === "completed" ? shiftDays(startAt - 130, 10) : undefined,
      createdAt: shiftDays(startAt - 150),
      categories,
      requirements,
      formFields,
      refundPolicy,
      routeProfile: isNative && categories.length > 0
        ? buildRouteProfile(rand, categories[categories.length - 1]!.distanceKm, categories[categories.length - 1]!.elevationGainM)
        : [],
      organizerName: org?.name ?? "Event eksternal",
      organizerVerified: org ? org.verificationStatus === "verified" : true,
      participantCount: 0,
      sourceUpdatedAt: seed.type === "external" ? shiftDays(-intBetween(rand, 1, 14), 9) : undefined,
    })
  })

  const eventById = new Map(events.map((e) => [e.id, e]))

  /* --- User demo + pelari lain --- */
  users.push({
    id: "usr-001",
    email: "rani@example.com",
    phone: "081234567890",
    fullName: "Rani Puspita",
    birthDate: "1996-04-18",
    gender: "female",
    emergencyContactName: "Bayu Puspita",
    emergencyContactPhone: "081298765432",
    status: "active",
    emailVerifiedAt: shiftDays(-220, 8),
    createdAt: shiftDays(-220, 8),
  })

  for (let i = 0; i < 420; i += 1) {
    const rand = mulberry32(hash(`user-${i}`))
    const first = pick(rand, FIRST_NAMES)
    const last = pick(rand, LAST_NAMES)
    const province = pick(rand, Object.keys(CITIES_BY_PROVINCE))
    void province
    users.push({
      id: `usr-${String(i + 2).padStart(4, "0")}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      phone: `08${intBetween(rand, 11, 99)}${intBetween(rand, 1000000, 9999999)}`,
      fullName: `${first} ${last}`,
      birthDate: `${intBetween(rand, 1972, 2007)}-${String(intBetween(rand, 1, 12)).padStart(2, "0")}-${String(intBetween(rand, 1, 28)).padStart(2, "0")}`,
      gender: rand() > 0.45 ? "male" : "female",
      emergencyContactName: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
      emergencyContactPhone: `08${intBetween(rand, 11, 99)}${intBetween(rand, 1000000, 9999999)}`,
      status: "active",
      emailVerifiedAt: shiftDays(-intBetween(rand, 10, 300), 8),
      createdAt: shiftDays(-intBetween(rand, 10, 300), 8),
    })
  }

  /* --- Pendaftaran --- */
  let regCounter = 0
  let orderCounter = 0
  let ticketCounter = 0

  const statusPool: Registration["status"][] = [
    "paid", "paid", "paid", "paid", "paid",
    "awaiting_payment", "awaiting_payment", "awaiting_payment",
    "pending_verification", "pending_verification",
    "rejected", "waitlisted", "expired", "checked_in", "checked_in", "refunded",
  ]

  function addRegistration(
    event: Event,
    category: EventCategory,
    user: User,
    status: Registration["status"],
    submittedDaysAgo: number,
  ): Registration {
    regCounter += 1
    const id = `reg-${String(regCounter).padStart(5, "0")}`
    const rand = mulberry32(hash(`${id}-${category.id}`))
    const submittedAt = shiftDays(-submittedDaysAgo, intBetween(rand, 7, 21))
    const approvedAt = ["approved", "awaiting_payment", "paid", "checked_in", "refunded"].includes(status)
      ? shiftDays(-submittedDaysAgo + 1, intBetween(rand, 8, 22))
      : undefined
    const paymentDeadlineAt = status === "awaiting_payment" ? shiftDays(1 + intBetween(rand, 0, 1), 20) : undefined
    const paidAt = ["paid", "checked_in", "refunded"].includes(status) ? shiftDays(-submittedDaysAgo + 2, intBetween(rand, 9, 23)) : undefined

    const bibNumber = paidAt
      ? `${category.bibPrefix}-${String(category.bibNext + regCounter).padStart(4, "0")}`
      : undefined

    const statusLogs: RegistrationStatusLog[] = []

    const pushLog = (
      from: Registration["status"] | null,
      to: Registration["status"],
      actorType: RegistrationStatusLog["actorType"],
      actorName: string,
      at: string,
      note?: string,
    ) => {
      statusLogs.push({
        id: `log-${id}-${statusLogs.length + 1}`,
        registrationId: id,
        fromStatus: from,
        toStatus: to,
        actorType,
        actorName,
        note,
        createdAt: at,
      })
    }

    pushLog(null, "pending_verification", "user", user.fullName, submittedAt, "Pendaftaran dikirim dari platform.")
    if (approvedAt) pushLog("pending_verification", "approved", "organizer", event.organizerName, approvedAt, "Dokumen kualifikasi sesuai persyaratan kategori.")
    if (paymentDeadlineAt) pushLog("approved", "awaiting_payment", "system", "Sistem", paymentDeadlineAt === undefined ? approvedAt! : shiftDays(-submittedDaysAgo + 1, 23), "Tagihan dibuat, menunggu pembayaran.")
    if (paidAt) pushLog("awaiting_payment", "paid", "system", "Payment Gateway", paidAt, "Pembayaran terverifikasi. Data terkunci, BIB dan tiket terbit.")
    if (status === "rejected") pushLog("pending_verification", "rejected", "organizer", event.organizerName, shiftDays(-submittedDaysAgo + 1, 10), "Sertifikat finisher belum memenuhi jarak minimum kategori.")
    if (status === "waitlisted") pushLog("pending_verification", "waitlisted", "system", "Sistem", shiftDays(-submittedDaysAgo + 1, 10), "Kuota kategori penuh, dimasukkan daftar tunggu.")
    if (status === "expired") pushLog("awaiting_payment", "expired", "system", "Sistem", shiftDays(-submittedDaysAgo + 3, 23), "Batas waktu pembayaran terlewat, slot dilepas.")
    if (status === "refunded") pushLog("paid", "refunded", "admin", "Wulan Damayanti", shiftDays(-submittedDaysAgo + 6, 11), "Event dibatalkan penyelenggara, refund penuh diproses.")
    if (status === "checked_in") pushLog("paid", "checked_in", "organizer", "Koordinator Racepack", shiftDays(-submittedDaysAgo + 4, 9), "Racepack diambil dengan QR tiket.")

    const answerValues: { key: string; value: string; sensitive: boolean }[] = [
      { key: "jersey_size", value: pick(rand, ["S", "M", "L", "XL", "XXL"]), sensitive: false },
      { key: "emergency_contact_name", value: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`, sensitive: true },
      { key: "emergency_contact_phone", value: `08${intBetween(rand, 11, 99)}${intBetween(rand, 1000000, 9999999)}`, sensitive: true },
      { key: "blood_type", value: pick(rand, ["A", "B", "AB", "O"]), sensitive: true },
      { key: "club", value: pick(rand, ["Trail Runners Indonesia", "Bandung Trail Club", "—"]), sensitive: false },
    ]

    const registration: Registration = {
      id,
      userId: user.id,
      eventId: event.id,
      categoryId: category.id,
      status,
      fullNameSnapshot: user.fullName,
      birthDateSnapshot: user.birthDate,
      waitlistPosition: status === "waitlisted" ? intBetween(rand, 1, 12) : undefined,
      reviewedBy: approvedAt || status === "rejected" ? `oa-${event.organizationId}-verifier` : undefined,
      submittedAt,
      reviewedAt: approvedAt ?? (status === "rejected" ? shiftDays(-submittedDaysAgo + 1, 10) : undefined),
      rejectionReason: status === "rejected" ? "Sertifikat finisher belum memenuhi jarak minimum kategori." : undefined,
      paymentDeadlineAt,
      approvedAt,
      paidAt,
      dataLockedAt: paidAt,
      bibNumber,
      refundPolicyId: event.refundPolicyId,
      refundPolicyVersion: event.refundPolicy?.version,
      createdAt: submittedAt,
      event,
      category,
      answers: event.formFields
        .filter((f) => answerValues.some((a) => a.key === f.fieldKey))
        .map((f, ai) => {
          const found = answerValues.find((a) => a.key === f.fieldKey)!
          return {
            id: `ans-${id}-${ai + 1}`,
            registrationId: id,
            fieldId: f.id,
            fieldLabel: f.label,
            value: found.value,
            isEncrypted: f.isSensitive,
          }
        }),
      qualificationSubmissions: event.requirements
        .filter((r) => r.categoryId === category.id)
        .map((r, ri) => ({
          id: `qs-${id}-${ri + 1}`,
          registrationId: id,
          requirementId: r.id,
          requirementLabel: r.label,
          valueText: r.requirementType === "custom_text" ? "Terlampir" : undefined,
          fileUrl: r.requirementType === "medical_certificate" || r.requirementType === "finisher_certificate" ? `https://docs.jejakTrail.id/kualifikasi/${id}-${ri + 1}.pdf` : undefined,
          externalLink: r.requirementType === "profile_link" ? `https://strava.com/athletes/${intBetween(rand, 100000, 999999)}` : undefined,
          status: status === "rejected" ? "rejected" : paidAt || approvedAt ? "accepted" : "submitted",
          reviewerNote: status === "rejected" ? "Jarak pada sertifikat 21K, minimum kategori 42K." : undefined,
          createdAt: submittedAt,
        })),
      statusLogs,
    }

    if (paymentDeadlineAt || paidAt) {
      orderCounter += 1
      const payment: Payment = {
        id: `pay-${String(orderCounter).padStart(5, "0")}`,
        registrationId: id,
        orderId: `JT-${submittedAt.slice(0, 10).replace(/-/g, "")}-${String(orderCounter).padStart(5, "0")}`,
        gateway: "Midtrans",
        gatewayRef: paidAt ? `mid-${hash(id) % 100000000}` : undefined,
        method: pick(rand, ["va", "ewallet", "qris", "card"]),
        amount: category.price,
        platformFee: Math.round(category.price * 0.03),
        gatewayFee: Math.round(category.price * 0.014) + 1000,
        status: paidAt ? (status === "refunded" ? "refunded" : status === "expired" ? "pending" : "paid") : status === "expired" ? "expired" : "pending",
        expiresAt: paymentDeadlineAt ?? shiftDays(-submittedDaysAgo + 4, 23),
        paidAt,
        createdAt: approvedAt ?? submittedAt,
      }
      payments.push(payment)
      registration.payment = payment

      if (status === "refunded") {
        refunds.push({
          id: `rfd-${refunds.length + 1}`,
          paymentId: payment.id,
          registrationId: id,
          amount: payment.amount,
          reasonType: "event_cancelled",
          status: "refunded",
          gatewayRef: `rf-${hash(id) % 100000000}`,
          feeBorneBy: "platform",
          processedBy: "adm-003",
          requestedAt: shiftDays(-submittedDaysAgo + 5, 10),
          processedAt: shiftDays(-submittedDaysAgo + 6, 11),
        })
      }
    }

    if (paidAt) {
      ticketCounter += 1
      const ticket: Ticket = {
        id: `tkt-${String(ticketCounter).padStart(5, "0")}`,
        registrationId: id,
        qrCode: `JT-${category.bibPrefix}-${hash(id) % 1000000}-${ticketCounter}`,
        status: status === "checked_in" ? "used" : "issued",
        issuedAt: paidAt,
      }
      tickets.push(ticket)
      registration.ticket = ticket

      if (status === "checked_in") {
        checkins.push({
          id: `chk-${checkins.length + 1}`,
          ticketId: ticket.id,
          checkedInBy: `oa-${event.organizationId}-racepack_staff`,
          checkedInByName: "Koordinator Racepack",
          pickupType: rand() > 0.82 ? "representative" : "self",
          representativeName: rand() > 0.82 ? `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}` : undefined,
          representativeNote: rand() > 0.82 ? "Membawa fotokopi KTP peserta" : undefined,
          createdOffline: rand() > 0.7,
          scannedAt: shiftDays(-submittedDaysAgo + 4, 9),
          syncedAt: rand() > 0.7 ? shiftDays(-submittedDaysAgo + 4, 12) : undefined,
        })
      }
    }

    return registration
  }

  // Pendaftaran untuk user demo
  const demoUser = users[0]!
  const demoPlan: { slug: string; categoryIndex: number; status: Registration["status"]; days: number }[] = [
    { slug: "sundoro-trail-challenge", categoryIndex: 2, status: "awaiting_payment", days: 2 },
    { slug: "bromo-tengger-trail", categoryIndex: 1, status: "pending_verification", days: 4 },
    { slug: "ijen-blue-fire-night-race", categoryIndex: 0, status: "paid", days: 12 },
    { slug: "merapi-sundown-run", categoryIndex: 1, status: "checked_in", days: 40 },
    { slug: "batur-caldera-sky-run", categoryIndex: 1, status: "waitlisted", days: 1 },
    { slug: "singgalang-ridge-marathon", categoryIndex: 1, status: "rejected", days: 9 },
    { slug: "sentul-forest-loop", categoryIndex: 0, status: "paid", days: 60 },
    { slug: "rinjani-ultra-100", categoryIndex: 0, status: "expired", days: 22 },
  ]

  demoPlan.forEach((plan) => {
    const event = events.find((e) => e.slug === plan.slug)
    const category = event?.categories[plan.categoryIndex]
    if (!event || !category) return
    registrations.push(addRegistration(event, category, demoUser, plan.status, plan.days))
  })

  // Pendaftaran massal untuk dashboard organizer & admin
  const nativeEvents = events.filter((e) => e.eventType === "native" && (e.status === "published" || e.status === "registration_closed" || e.status === "completed"))
  nativeEvents.forEach((event) => {
    const rand = mulberry32(hash(`bulk-${event.id}`))
    const target = event.status === "completed" ? 0.92 : event.status === "registration_closed" ? 0.85 : 0.34 + rand() * 0.42
    event.categories.forEach((category) => {
      const count = Math.min(category.quota, Math.round(category.quota * target * (0.7 + rand() * 0.6)))
      for (let i = 0; i < count; i += 1) {
        const user = users[intBetween(rand, 1, users.length - 1)]!
        const status = pick(rand, statusPool)
        const finalStatus: Registration["status"] =
          category.requiresQualification && status === "paid" && rand() > 0.8 ? "pending_verification" : status
        registrations.push(addRegistration(event, category, user, finalStatus, intBetween(rand, 3, Math.max(4, Math.abs(Math.round((new Date(event.eventStartAt).getTime() - Date.now()) / DAY))))))
      }
    })
  })

  // Hitung ulang participantCount
  events.forEach((event) => {
    const counts = new Map<string, number>()
    registrations.forEach((r) => {
      if (r.eventId !== event.id) return
      if (!["approved", "awaiting_payment", "paid", "checked_in"].includes(r.status)) return
      counts.set(r.categoryId, (counts.get(r.categoryId) ?? 0) + 1)
    })
    event.participantCount = [...counts.values()].reduce((a, b) => a + b, 0)
    event.categoryCounts = Object.fromEntries(counts)
  })

  organizations.forEach((org) => {
    org.eventCount = events.filter((e) => e.organizationId === org.id).length
  })

  /* --- Pencairan --- */
    const moneyEvents = events.filter((e) => e.eventType === "native" && e.organizationId && ["published", "registration_closed", "completed", "cancelled"].includes(e.status))
  moneyEvents.forEach((event) => {
    const paidRegs = registrations.filter((r) => r.eventId === event.id && ["paid", "checked_in"].includes(r.status))
    const collected = paidRegs.reduce((sum, r) => sum + (r.payment?.amount ?? 0), 0)
    if (collected <= 0) return
    const rnd = mulberry32(hash(`dsb-${event.id}`))
    const stages: Disbursement["stage"][] = event.status === "completed" ? [1, 2, 3] : event.status === "registration_closed" ? [1, 2] : [1]
    stages.forEach((stage) => {
      const percentage = stage === 1 ? 25 : stage === 2 ? 45 : 30
      const amount = Math.round((collected * percentage) / 100)
      const status: Disbursement["status"] =
        event.status === "completed" && stage === 3 ? "eligible" : stage === 1 ? "paid" : stage === 2 ? "approved" : "pending"
      disbursements.push({
        id: `dsb-${event.id}-${stage}`,
        eventId: event.id,
        organizationId: event.organizationId!,
        bankAccountId: `bank-${event.organizationId}`,
        stage,
        percentage,
        amount,
        status,
        approvedBy: status === "approved" || status === "paid" ? "adm-003" : undefined,
        requestedAt: shiftDays(-intBetween(rnd, 10, 60), 10),
        approvedAt: status === "approved" || status === "paid" ? shiftDays(-intBetween(rnd, 5, 20), 14) : undefined,
        paidAt: status === "paid" ? shiftDays(-intBetween(rnd, 2, 12), 15) : undefined,
        payoutRef: status === "paid" ? `PO-${hash(event.id) % 1000000}` : undefined,
        note: stage === 3 ? "Menunggu konfirmasi tidak ada sengketa terbuka." : undefined,
        conditions: [
          { id: `dc-${event.id}-${stage}-1`, disbursementId: `dsb-${event.id}-${stage}`, conditionKey: "org_verified", description: "Organizer terverifikasi penuh", isMet: true, checkedBy: "adm-003", checkedAt: shiftDays(-intBetween(rnd, 20, 40), 9) },
          { id: `dc-${event.id}-${stage}-2`, disbursementId: `dsb-${event.id}-${stage}`, conditionKey: stage === 1 ? "venue_permit_uploaded" : "racepack_ready", description: stage === 1 ? "Izin lokasi diunggah" : "Racepack siap didistribusikan", isMet: stage !== 3, checkedBy: stage !== 3 ? "adm-003" : undefined, checkedAt: stage !== 3 ? shiftDays(-intBetween(rnd, 10, 30), 9) : undefined },
          { id: `dc-${event.id}-${stage}-3`, disbursementId: `dsb-${event.id}-${stage}`, conditionKey: stage === 3 ? "no_open_dispute" : "vendor_contract_uploaded", description: stage === 3 ? "Tidak ada sengketa terbuka" : "Kontrak vendor diunggah", isMet: stage === 1, checkedBy: stage === 1 ? "adm-003" : undefined, checkedAt: stage === 1 ? shiftDays(-intBetween(rnd, 10, 30), 9) : undefined },
        ],
        event,
      })
    })
  })
  
  /* --- Sengketa --- */
  const disputeSeeds: {
    type: Dispute["disputeType"]
    status: Dispute["status"]
    desc: string
    reporter: string
    reporterType: Dispute["reporterType"]
    days: number
  }[] = [
    { type: "refund", status: "open", desc: "Saya mengajukan pembatalan 21 hari sebelum event dan sudah memenuhi syarat refund 70%, tetapi dana belum masuk setelah 14 hari kerja.", reporter: "Rani Puspita", reporterType: "user", days: 4 },
    { type: "rejection", status: "in_review", desc: "Pendaftaran saya ditolak karena sertifikat 21K, padahal saya punya finisher 42K di event lain yang belum diunggah. Mohon ditinjau ulang.", reporter: "Bagas Nugroho", reporterType: "user", days: 7 },
    { type: "payment", status: "open", desc: "Pembayaran saya berhasil di e-wallet, tetapi status pendaftaran masih menunggu pembayaran.", reporter: "Sinta Hidayat", reporterType: "user", days: 1 },
    { type: "organizer_fraud", status: "in_review", desc: "Informasi lokasi dan jadwal racepack berbeda jauh dari yang dijanjikan pada halaman event.", reporter: "Fajar Santoso", reporterType: "user", days: 11 },
    { type: "event_cancelled", status: "resolved", desc: "Event dibatalkan karena cuaca. Refund sudah diproses, mohon dipastikan seluruh peserta menerima notifikasi.", reporter: "Nadia Ramadhan", reporterType: "user", days: 30 },
  ]
  disputeSeeds.forEach((seed, index) => {
    const event = nativeEvents[index % Math.max(1, nativeEvents.length)]
    disputes.push({
      id: `dsp-${index + 1}`,
      eventId: event?.id ?? "evt-001",
      registrationId: registrations.find((r) => r.eventId === event?.id)?.id,
      reporterType: seed.reporterType,
      reporterName: seed.reporter,
      disputeType: seed.type,
      description: seed.desc,
      status: seed.status,
      handledBy: seed.status === "open" ? undefined : "adm-002",
      resolution: seed.status === "resolved" ? "Refund penuh diproses dan peserta sudah dikonfirmasi melalui email." : undefined,
      createdAt: shiftDays(-seed.days, 13),
      resolvedAt: seed.status === "resolved" ? shiftDays(-seed.days + 4, 10) : undefined,
      eventTitle: event?.title ?? "Event",
    })
  })

  /* --- Pengumuman --- */
  const broadcastSeeds = [
    { subject: "Racepack pickup & jadwal briefing", message: "Pengambilan racepack dibuka H-2 sampai H-1 di lokasi berikut. Wajib membawa KTP dan QR tiket.", recipients: 0 },
    { subject: "Pengingat mandatory gear", message: "Pemeriksaan mandatory gear dilakukan sebelum start. Peserta tanpa whistle dan emergency blanket tidak diizinkan start.", recipients: 0 },
    { subject: "Perubahan jam start kategori 42K", message: "Start kategori 42K dimajukan 30 menit menjadi 04.30 WIB karena pertimbangan cuaca.", recipients: 0 },
  ]
  broadcastSeeds.forEach((seed, index) => {
    const rand = mulberry32(hash(`broadcast-${index}`))
    const event = events.find((e) => e.id === `evt-00${index + 1}`) ?? events[0]!
    broadcasts.push({
      id: `brd-${index + 1}`,
      eventId: event.id,
      sentBy: "Race Director",
      channel: index === 2 ? "whatsapp" : "email",
      subject: seed.subject,
      message: seed.message,
      recipients: registrations.filter((r) => r.eventId === event.id && ["paid", "checked_in"].includes(r.status)).length,
      sentAt: shiftDays(-intBetween(rand, 2, 18), 11),
    })
  })

  /* --- Notifikasi untuk user demo --- */
  const demoRegs = registrations.filter((r) => r.userId === demoUser.id)
  demoRegs.forEach((reg, index) => {
    const event = eventById.get(reg.eventId)
    notifications.push({
      id: `ntf-${index + 1}`,
      recipientType: "attendee",
      recipientId: demoUser.id,
      channel: "email",
      templateKey: `registration.${reg.status}`,
      title: `Status pendaftaran ${event?.title ?? "event"}: ${reg.status}`,
      body: `Pendaftaran kategori ${reg.category?.name ?? ""} kini berstatus ${reg.status}.`,
      status: "sent",
      readAt: index > 2 ? shiftDays(-1, 9) : undefined,
      sentAt: shiftDays(-index - 1, 10),
      createdAt: shiftDays(-index - 1, 10),
    })
  })
  notifications.push(
    {
      id: "ntf-blast-1",
      recipientType: "attendee",
      recipientId: demoUser.id,
      channel: "email",
      templateKey: "broadcast.racepack",
      title: "Pengumuman: jadwal pengambilan racepack",
      body: "Pengambilan racepack dibuka H-2 sampai H-1. Wajib membawa KTP dan QR tiket.",
      status: "sent",
      readAt: undefined,
      sentAt: shiftDays(-2, 11),
      createdAt: shiftDays(-2, 11),
    },
    {
      id: "ntf-blast-2",
      recipientType: "attendee",
      recipientId: demoUser.id,
      channel: "in_app",
      templateKey: "event.new",
      title: "Event baru di provinsi Anda",
      body: "3 event trail baru dibuka pendaftarannya di Jawa Barat bulan ini.",
      status: "sent",
      readAt: shiftDays(-3, 8),
      sentAt: shiftDays(-3, 8),
      createdAt: shiftDays(-3, 8),
    },
  )

  /* --- Audit log --- */
  const auditSeeds: { action: string; entity: string; actor: string; actorType: AuditLog["actorType"]; days: number; after: Record<string, unknown> }[] = [
    { action: "organization.verify", entity: "organizations", actor: "Sekar Ayu Larasati", actorType: "admin", days: 2, after: { verification_status: "verified" } },
    { action: "event.publish", entity: "events", actor: "Sekar Ayu Larasati", actorType: "admin", days: 3, after: { status: "published" } },
    { action: "disbursement.approve", entity: "disbursements", actor: "Wulan Damayanti", actorType: "admin", days: 4, after: { status: "approved", stage: 2 } },
    { action: "refund.process", entity: "refunds", actor: "Wulan Damayanti", actorType: "admin", days: 6, after: { status: "refunded", fee_borne_by: "platform" } },
    { action: "registration.reject", entity: "registrations", actor: "Trail Runners Indonesia", actorType: "organizer", days: 7, after: { status: "rejected", rejection_reason: "Sertifikat tidak sesuai" } },
    { action: "event.suspend", entity: "events", actor: "Bramantyo Adi", actorType: "admin", days: 9, after: { status: "suspended" } },
    { action: "bank_account.update", entity: "organization_bank_accounts", actor: "Jejak Nusantara Events", actorType: "organizer", days: 12, after: { verification_status: "pending" } },
    { action: "dispute.resolve", entity: "disputes", actor: "Bramantyo Adi", actorType: "admin", days: 14, after: { status: "resolved" } },
    { action: "event.external.create", entity: "events", actor: "Bramantyo Adi", actorType: "admin", days: 17, after: { event_type: "external" } },
    { action: "user.suspend", entity: "users", actor: "Sekar Ayu Larasati", actorType: "admin", days: 21, after: { status: "suspended" } },
  ]
  auditSeeds.forEach((seed, index) => {
    auditLogs.push({
      id: `aud-${index + 1}`,
      actorType: seed.actorType,
      actorName: seed.actor,
      action: seed.action,
      entityType: seed.entity,
      entityId: `${seed.entity.slice(0, 3)}-${1000 + index}`,
      before: undefined,
      after: seed.after,
      ipAddress: `10.20.${intBetween(mulberry32(index + 1), 1, 250)}.${intBetween(mulberry32(index + 2), 2, 250)}`,
      createdAt: shiftDays(-seed.days, 10),
    })
  })

  return {
    users,
    organizations,
    organizerAccounts,
    bankAccounts,
    adminUsers,
    events,
    refundPolicies,
    registrations,
    payments,
    tickets,
    checkins,
    disbursements,
    disputes,
    broadcasts,
    notifications,
    auditLogs,
    refunds,
  }
}

export type Database = ReturnType<typeof buildDatabase>

/* ------------------------------------------------------------------ */
/* Agregat                                                           */
/* ------------------------------------------------------------------ */

export function computeOrganizerStats(
  db: Database,
  organizationId: string,
): OrganizerStats {
  const orgEvents = db.events.filter((e) => e.organizationId === organizationId)
  const eventIds = new Set(orgEvents.map((e) => e.id))
  const regs = db.registrations.filter((r) => eventIds.has(r.eventId))

  const registrationsByCategory = orgEvents.flatMap((event) =>
    event.categories.map((cat) => ({
      category: `${event.title.split(" ")[0]} ${cat.name}`,
      terisi: regs.filter(
        (r) => r.categoryId === cat.id && ["approved", "awaiting_payment", "paid", "checked_in"].includes(r.status),
      ).length,
      kuota: cat.quota,
    })),
  )

  const days = 30
  const registrationTrend: OrganizerStats["registrationTrend"] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = new Date(Date.now() - i * DAY)
    const key = dayStart.toISOString().slice(0, 10)
    const dayRegs = regs.filter((r) => r.submittedAt.slice(0, 10) === key)
    registrationTrend.push({
      date: key,
      pendaftar: dayRegs.length,
      lunas: dayRegs.filter((r) => r.paidAt).length,
    })
  }

  const jerseyOrder = ["XS", "S", "M", "L", "XL", "XXL"]
  const jerseyMap = new Map<string, number>()
  regs.forEach((r) => {
    if (!["paid", "checked_in"].includes(r.status)) return
    const jersey = r.answers.find((a) => a.fieldLabel.toLowerCase().includes("jersey"))?.value
    if (!jersey) return
    jerseyMap.set(jersey, (jerseyMap.get(jersey) ?? 0) + 1)
  })

  const paidRegs = regs.filter((r) => ["paid", "checked_in"].includes(r.status))
  const collected = paidRegs.reduce((sum, r) => sum + (r.payment?.amount ?? 0), 0)
  const disbursed = db.disbursements
    .filter((d) => eventIds.has(d.eventId) && d.status === "paid")
    .reduce((sum, d) => sum + d.amount, 0)
  const held = Math.max(0, collected - disbursed)

  return {
    registrationsByCategory,
    registrationTrend,
    jerseyRecap: jerseyOrder.map((size) => ({ size, count: jerseyMap.get(size) ?? 0 })),
    money: {
      collected,
      disbursed,
      held,
      estimated: Math.round(collected * 0.97),
    },
  }
}

export function computeAdminStats(db: Database): AdminStats {
  const paid = db.registrations.filter((r) => ["paid", "checked_in"].includes(r.status))
  const gmv = paid.reduce((sum, r) => sum + (r.payment?.amount ?? 0), 0)
  const platformRevenue = db.payments
    .filter((p) => p.status === "paid" || p.status === "refunded")
    .reduce((sum, p) => sum + p.platformFee, 0)

  const months = ["Jun", "Jul", "Agu", "Sep", "Okt"]
  const growth = months.map((month, index) => {
    const factor = 0.55 + index * 0.13
    return {
      month,
      users: Math.round(db.users.length * factor * 0.4),
      registrations: Math.round(db.registrations.length * factor * 0.35),
      gmv: Math.round(gmv * factor * 0.4),
    }
  })

  return {
    totalEvents: db.events.length,
    nativeEvents: db.events.filter((e) => e.eventType === "native").length,
    externalEvents: db.events.filter((e) => e.eventType === "external").length,
    totalRegistrations: db.registrations.length,
    gmv,
    platformRevenue,
    pendingOrganizations: db.organizations.filter((o) => o.verificationStatus === "pending").length,
    pendingEvents: db.events.filter((e) => e.status === "pending_review").length,
    openDisputes: db.disputes.filter((d) => d.status === "open" || d.status === "in_review").length,
    growth,
    eventMix: [
      { name: "Native", value: db.events.filter((e) => e.eventType === "native").length, color: "var(--chart-1)" },
      { name: "Eksternal", value: db.events.filter((e) => e.eventType === "external").length, color: "var(--chart-2)" },
    ],
  }
}

/* ------------------------------------------------------------------ */
/* Mock Data Exports for Pages                                         */
/* ------------------------------------------------------------------ */

const db = buildDatabase();

export const mockUsers = db.users;
export const mockOrganizations = db.organizations;
export const mockEvents = db.events;
export const mockRegistrations = db.registrations;
export const mockPayments = db.payments;
export const mockCheckins = db.checkins;
export const mockDisbursements = db.disbursements;
export const mockDisputes = db.disputes;
export const mockBroadcasts = db.broadcasts;
export const mockNotifications = db.notifications;
export const mockAuditLogs = db.auditLogs;
export const mockRefunds = db.refunds;

// Specific aggregates for dashboards
export const mockAdminStats = computeAdminStats(db);
export const mockRecentAudit = db.auditLogs.slice(0, 10);

export const mockOrganizerStats = computeOrganizerStats(db, "org-001");
export const mockRecentRegistrations = db.registrations.slice(0, 5);
export const mockUpcomingEvents = db.events.filter(e => e.status === 'published').slice(0, 3);

export const mockFinance = {
  totalIncome: "Rp 150M",
  totalExpense: "Rp 20M",
  netProfit: "Rp 130M",
};

export const mockTeam = [
  { id: 'oa-001-owner', name: 'Rangga Prasetyo', role: 'owner', email: 'owner@org-001.id', status: 'active' },
  { id: 'oa-001-verifier', name: 'Sinta Hidayat', role: 'verifier', email: 'verifier@org-001.id', status: 'active' },
];

export const mockUserProfile = db.users[0];
export const mockNotificationsSettings = [
  { id: 'n1', key: 'email_notifications', label: 'Email Notifications', enabled: true },
  { id: 'n2', key: 'push_notifications', label: 'Push Notifications', enabled: false },
];

export const mockAccountOverviewStats = {
  totalEvents: 5,
  approved: 3,
  paid: 2,
  checkedIn: 1,
};

export const mockEventProgress = [
  { event: 'Sundoro Trail', status: 'paid', progress: 100 },
  { event: 'Bromo Run', status: 'pending_verification', progress: 40 },
];

export const mockTickets = db.tickets;

export const mockDocuments = [
  { id: 'doc-1', title: 'Sertifikat Finisher Sundoro 21K', type: 'finisher_certificate', url: '#', uploadedAt: '2026-01-15' },
  { id: 'doc-2', title: 'Surat Keterangan Sehat', type: 'medical_certificate', url: '#', uploadedAt: '2026-02-01' },
];
