import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ChevronsUpDown, LogIn, LogOut, RotateCcw, ShieldCheck, Store, User as UserIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { actions } from "@/lib/mock/store"
import { ROLE_HOME, ROLE_LABEL_KEY } from "@/components/layout/nav-config"
import { initials } from "@/lib/format"
import { useIdentity, useSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import type { AccountType } from "@/types"

const ROLE_ICON: Record<AccountType, typeof UserIcon> = {
  attendee: UserIcon,
  organizer: Store,
  admin: ShieldCheck,
}

export function AccountSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { accountType, isAuthenticated, switchAccountType, signOut } = useSession()
  const identity = useIdentity()

  const displayName = !isAuthenticated
    ? t("nav.login")
    : accountType === "attendee"
      ? identity.user.fullName
      : accountType === "organizer"
        ? identity.organizer.fullName
        : identity.admin.fullName

  const displaySub = !isAuthenticated
    ? t("roles.attendee")
    : accountType === "attendee"
      ? identity.user.email
      : accountType === "organizer"
        ? identity.organization.name
        : identity.admin.email

  const RoleIcon = ROLE_ICON[accountType]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-auto gap-2 rounded-full border-border/80 py-1.5 pl-1.5 pr-2.5",
            compact && "border-transparent bg-transparent pl-1 pr-1",
          )}
        >
          <Avatar className="size-7 border border-amber-500/30">
            <AvatarFallback className="bg-gradient-to-br from-[#123523] to-[#071410] text-[11px] font-semibold text-amber-200">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
            <span className="max-w-[150px] truncate text-xs font-semibold">{displayName}</span>
            <span className="max-w-[150px] truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {t(ROLE_LABEL_KEY[accountType])}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{displayName}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{displaySub}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Ganti konteks akun
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {(["attendee", "organizer", "admin"] as AccountType[]).map((role) => {
            const Icon = ROLE_ICON[role]
            return (
              <DropdownMenuItem
                key={role}
                className="justify-between"
                onClick={() => {
                  switchAccountType(role)
                  navigate(ROLE_HOME[role])
                }}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {t("auth." + (role === "attendee" ? "asAttendee" : role === "organizer" ? "asOrganizer" : "asAdmin"))}
                </span>
                {accountType === role && <RoleIcon className="size-3.5 text-amber-500" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => actions.resetDemoData()}>
          <RotateCcw className="size-4" />
          Reset data demo
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isAuthenticated ? (
          <DropdownMenuItem
            onClick={() => {
              signOut()
              navigate("/masuk")
            }}
          >
            <LogOut className="size-4" />
            {t("actions.logout")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/masuk">
              <LogIn className="size-4" />
              {t("actions.login")}
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
