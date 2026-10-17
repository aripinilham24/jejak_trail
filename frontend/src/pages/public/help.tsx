import { Link } from "react-router-dom"
import {
  BookOpen,
  LifeBuoy,
  Mail,
  MessageCircle,
  PlayCircle,
  ScanLine,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SectionHeading } from "@/components/shared/section-heading"

const TOPICS = [
  {
    icon: BookOpen,
    title: "Panduan pendaftaran peserta",
    body: "Memilih kategori, mengunggah dokumen kualifikasi, dan membaca kebijakan refund sebelum membayar.",
    to: "/events",
  },
  {
    icon: ShieldCheck,
    title: "Alur verifikasi kualifikasi",
    body: "Apa yang ditinjau penyelenggara, kenapa pendaftaran bisa ditolak, dan bagaimana mengajukan ulang.",
    to: "/tentang",
  },
  {
    icon: Wallet,
    title: "Pembayaran, refund, dan pencairan",
    body: "Status pembayaran, batas waktu tagihan, kebijakan refund per event, dan tahapan pencairan dana.",
    to: "/tentang",
  },
  {
    icon: ScanLine,
    title: "Check-in racepack & mode offline",
    body: "Cara memindai QR tiket, pengambilan oleh perwakilan, dan sinkronisasi data setelah offline.",
    to: "/organizer/checkin",
  },
]

export function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Pusat bantuan"
        title="Bagaimana kami bisa membantu?"
        subtitle="Cari panduan berdasarkan topik, atau kirim pertanyaan langsung ke tim Jejak Trail."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {TOPICS.map((topic) => (
          <Link
            key={topic.title}
            to={topic.to}
            className="panel group flex gap-4 rounded-2xl p-5 transition-all hover:border-amber-500/40"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-background/70 text-amber-600 dark:text-amber-300">
              <topic.icon className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold group-hover:text-amber-600 dark:group-hover:text-amber-400">
                {topic.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{topic.body}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold">Kirim pertanyaan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tim support menjawab pada hari kerja, 09.00–18.00 WIB.
          </p>
          <form className="mt-5 space-y-4" onSubmit={(event) => event.preventDefault()}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="help-name">Nama</Label>
                <Input id="help-name" placeholder="Nama lengkap" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="help-email">Email</Label>
                <Input id="help-email" type="email" placeholder="alamat@email.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Topik</Label>
              <Select defaultValue="pendaftaran">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendaftaran">Pendaftaran peserta</SelectItem>
                  <SelectItem value="pembayaran">Pembayaran & refund</SelectItem>
                  <SelectItem value="organizer">Kebutuhan organizer</SelectItem>
                  <SelectItem value="sengketa">Sengketa</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="help-message">Pesan</Label>
              <Textarea id="help-message" rows={5} placeholder="Jelaskan kendala Anda secara singkat…" />
            </div>
            <Button type="submit" className="rounded-full">
              Kirim pesan
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="panel rounded-2xl p-5">
            <span className="grid size-10 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <Mail className="size-5" />
            </span>
            <p className="mt-3 font-display text-sm font-semibold">Email support</p>
            <p className="mt-1 text-sm text-muted-foreground">support@jejakTrail.id</p>
          </div>
          <div className="panel rounded-2xl p-5">
            <span className="grid size-10 place-items-center rounded-xl border border-border bg-background/70 text-amber-600 dark:text-amber-300">
              <MessageCircle className="size-5" />
            </span>
            <p className="mt-3 font-display text-sm font-semibold">WhatsApp</p>
            <p className="mt-1 text-sm text-muted-foreground">+62 811-0000-000 (hari kerja)</p>
          </div>
          <div className="panel rounded-2xl p-5">
            <span className="grid size-10 place-items-center rounded-xl border border-border bg-background/70 text-amber-600 dark:text-amber-300">
              <LifeBuoy className="size-5" />
            </span>
            <p className="mt-3 font-display text-sm font-semibold">Sengketa & laporan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sampaikan laporan melalui halaman sengketa. Setiap laporan tercatat dan ditangani tim
              support.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 rounded-full">
              <Link to="/akun">
                <PlayCircle className="size-3.5" />
                Buka akun saya
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
