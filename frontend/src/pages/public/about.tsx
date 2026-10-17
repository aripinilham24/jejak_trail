import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowRight, Compass, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { SectionHeading } from "@/components/shared/section-heading"

const FAQ = [
  {
    q: "Apa bedanya event native dan event eksternal?",
    a: "Event native dibuat dan dikelola penyelenggara langsung di Jejak Trail: pendaftaran, verifikasi kualifikasi, pembayaran, BIB, dan tiket QR berjalan di platform. Event eksternal hanya dicatat di kalender discovery dan pendaftarannya mengarah ke website penyelenggara.",
  },
  {
    q: "Kenapa alurnya verifikasi dulu baru bayar?",
    a: "Trail run sering mensyaratkan kualifikasi: sertifikat finisher, tautan hasil lomba, atau surat sehat. Peserta mengirim dokumen lebih dulu, penyelenggara meninjau, dan tagihan baru terbit setelah disetujui. Bila ditolak, tidak ada pembayaran yang perlu dikembalikan.",
  },
  {
    q: "Apakah data saya bisa diubah setelah bayar?",
    a: "Tidak. Setelah status lunas, data peserta terkunci termasuk ukuran jersey, karena data ini menjadi dasar penerbitan BIB dan persiapan racepack. Koreksi hanya dapat dilakukan melalui penyelenggara.",
  },
  {
    q: "Bagaimana kebijakan refund ditentukan?",
    a: "Kebijakan refund diatur penyelenggara per event dan wajib terlihat sebelum peserta membayar. Kebijakan yang berlaku disimpan bersama transaksi bersama versinya, sehingga peserta selalu tahu aturan yang mereka setujui.",
  },
  {
    q: "Bagaimana pencairan dana ke penyelenggara?",
    a: "Dana dicairkan bertahap. Sebagian sebelum event untuk kebutuhan vendor, sebagian saat racepack siap, dan sisanya setelah event selesai serta tidak ada sengketa terbuka. Setiap pencairan disetujui manual oleh tim keuangan platform dan tercatat di log audit.",
  },
  {
    q: "Apakah check-in racepack butuh sinyal?",
    a: "Tidak. Daftar peserta diunduh ke perangkat dan pemindaian QR tetap berjalan offline. Data hasil pemindaian disinkronkan begitu perangkat kembali tersambung.",
  },
]

export function AboutPage() {
  const { t } = useTranslation()

  const values = [
    {
      icon: Compass,
      title: "Discovery yang jujur",
      body: "Setiap event menampilkan jarak, elevasi, cut-off, dan status pendaftaran apa adanya. Tidak ada slot tersembunyi.",
    },
    {
      icon: ShieldCheck,
      title: "Verifikasi yang dapat diaudit",
      body: "Keputusan verifikasi kualifikasi, penolakan, refund, dan pencairan dana tercatat lengkap dengan pelaku dan waktu.",
    },
    {
      icon: HeartHandshake,
      title: "Adil untuk pelari dan penyelenggara",
      body: "Kuota tidak bisa di-overselling, dana ditahan sebagian sebagai jaminan refund, dan kebijakan refund transparan.",
    },
  ]

  return (
    <div className="relative">
      <section className="relative overflow-hidden border-b border-border">
        <div className="topo-pattern pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
            Tentang
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Satu tempat untuk seluruh jejak trail run Indonesia
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Informasi event trail run hari ini tersebar di Instagram, grup WhatsApp, dan website
            masing-masing penyelenggara. Jejak Trail menyatukannya menjadi kalender yang rapi,
            sekaligus menyediakan sistem pendaftaran yang memahami kebutuhan trail run:
            kualifikasi, kuota, BIB, racepack, dan pencairan dana bertahap.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full">
              <Link to="/events">
                {t("home.ctaPrimary")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/daftar/organizer">{t("home.ctaSecondary")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {values.map((value) => (
            <div key={value.title} className="panel rounded-2xl p-5">
              <span className="grid size-11 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">
                <value.icon className="size-5" />
              </span>
              <h3 className="mt-3 font-display text-base font-semibold">{value.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface-2/30">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeading
            eyebrow="Perjalanan produk"
            title="Bertahap, dari kalender sampai ticketing"
            subtitle="Kami membangun audiens lebih dulu melalui kalender event, lalu membuka monetisasi ringan, sebelum menghadirkan ticketing native untuk organizer pilot."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "Fase 1", title: "Kalender & discovery", body: "Kurasi event eksternal, filter, dan newsletter pengingat." },
              { step: "Fase 2", title: "Monetisasi ringan", body: "Featured event dan tautan referral yang terukur." },
              { step: "Fase 3", title: "Ticketing native", body: "Pendaftaran, verifikasi, pembayaran, tiket QR, check-in, pencairan bertahap." },
              { step: "Fase 4", title: "Sisi pelari", body: "Profil pelari, riwayat race, dokumen kualifikasi yang dapat dipakai ulang." },
            ].map((phase, index) => (
              <div key={phase.step} className="panel relative overflow-hidden rounded-2xl p-5">
                <span className="absolute right-3 top-2 font-display text-4xl font-semibold text-border/60">
                  {index + 1}
                </span>
                <p className="font-mono text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {phase.step}
                </p>
                <h3 className="mt-2 font-display text-base font-semibold">{phase.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{phase.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="Tanya jawab"
          title="Hal yang paling sering ditanyakan"
          subtitle="Belum menemukan jawabannya? Hubungi tim kami melalui pusat bantuan."
        />
        <Accordion type="single" collapsible className="mt-6">
          {FAQ.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index}`}>
              <AccordionTrigger className="text-left font-display text-sm font-semibold hover:no-underline sm:text-base">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Separator className="my-10" />

        <div className="panel flex flex-col items-start gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 text-amber-500" />
            <div>
              <p className="font-display text-base font-semibold">Punya event trail run?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Daftarkan organisasi Anda dan mulai kelola pendaftaran dari satu dasbor.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0 rounded-full">
            <Link to="/daftar/organizer">{t("home.organizerCta")}</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
