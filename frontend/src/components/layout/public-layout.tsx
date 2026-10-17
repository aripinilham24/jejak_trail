import { Outlet, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"

export function PublicLayout({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [pathname])

  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
        {children}
      </main>
      <PublicFooter />
    </div>
  )
}
