import { Link } from "react-router-dom"
import { Compass, Home, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="relative mx-auto flex min-h-[70svh] w-full max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
      <div className="topo-pattern pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative space-y-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">
          Error 404
        </p>
        <p className="font-display text-6xl font-semibold tracking-tight sm:text-7xl">404</p>
        <h1 className="font-display text-2xl font-semibold">Jejak ini tidak ditemukan</h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Halaman yang Anda cari mungkin sudah dipindahkan, atau tautannya salah ketik. Mari kembali
          ke jalur utama.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-full">
            <Link to="/">
              <Home className="size-4" />
              Beranda
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/events">
              <Search className="size-4" />
              Jelajahi event
            </Link>
          </Button>
        </div>
        <p className="flex items-center justify-center gap-2 pt-4 text-xs text-muted-foreground">
          <Compass className="size-3.5" />
          Jejak Trail · Trail run discovery &amp; ticketing
        </p>
      </div>
    </div>
  )
}
