import { createBrowserRouter } from "react-router-dom"
import { PublicLayout } from "@/components/layout/public-layout"
import { AboutPage } from "@/pages/public/about"
import { CalendarPage } from "@/pages/public/calendar"
import { EventDetailPage } from "@/pages/public/event-detail"
import { EventsListPage } from "@/pages/public/events-list"
import { HelpPage } from "@/pages/public/help"
import { HomePage } from "@/pages/public/home"
import { NotFoundPage } from "@/pages/public/not-found"
import { LoginPage } from "@/pages/auth/login"
import { RegisterAttendeePage } from "@/pages/auth/register-attendee"
import { RegisterOrganizerPage } from "@/pages/auth/register-organizer"
import { AccountOverviewPage } from "@/pages/account/overview"
import { AccountRegistrationsPage } from "@/pages/account/registrations"
import { AccountRegistrationDetailPage } from "@/pages/account/registration-detail"
import { AccountCheckoutPage } from "@/pages/account/checkout"
import { AccountTicketsPage } from "@/pages/account/tickets"
import { AccountTicketDetailPage } from "@/pages/account/ticket-detail"
import { AccountDocumentsPage } from "@/pages/account/documents"
import { AccountNotificationsPage } from "@/pages/account/notifications"
import { AccountProfilePage } from "@/pages/account/profile"
import { RegisterEventPage } from "@/pages/registration/register-event"
import { OrganizerDashboardPage } from "@/pages/organizer/dashboard"
import { OrganizerEventsPage } from "@/pages/organizer/events"
import { EventNewPage } from "@/pages/organizer/event-new"
import { OrganizerOnboardingPage } from "@/pages/organizer/onboarding"
import { OrganizerEventDetailPage } from "@/pages/organizer/event-detail"
import { OrganizerVerificationsPage } from "@/pages/organizer/verifications"
import { OrganizerParticipantsPage } from "@/pages/organizer/participants"
import { OrganizerCheckinPage } from "@/pages/organizer/checkin"
import { OrganizerAnnouncementsPage } from "@/pages/organizer/announcements"
import { OrganizerFinancePage } from "@/pages/organizer/finance"
import { OrganizerTeamPage } from "@/pages/organizer/team"
import { OrganizerProfilePage } from "@/pages/organizer/profile"
import { AdminDashboardPage } from "@/pages/admin/dashboard"
import { AdminOrganizationsPage } from "@/pages/admin/organizations"
import { AdminEventsPage } from "@/pages/admin/events"
import { AdminExternalEventsPage } from "@/pages/admin/external-events"
import { AdminFinancePage } from "@/pages/admin/finance"
import { AdminRefundsPage } from "@/pages/admin/refunds"
import { AdminDisputesPage } from "@/pages/admin/disputes"
import { AdminUsersPage } from "@/pages/admin/users"
import { AdminAuditPage } from "@/pages/admin/audit"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "events", element: <EventsListPage /> },
      { path: "events/:slug", element: <EventDetailPage /> },
      { path: "kalender", element: <CalendarPage /> },
      { path: "tentang", element: <AboutPage /> },
      { path: "bantuan", element: <HelpPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register-attendee",
    element: <RegisterAttendeePage />,
  },
  {
    path: "/register-organizer",
    element: <RegisterOrganizerPage />,
  },
  {
    path: "/registration/:id",
    element: <RegisterEventPage />,
  },
  {
    path: "/account",
    element: <DashboardShell role="attendee" />,
    children: [
      { index: true, element: <AccountOverviewPage /> },
      { path: "registrations", element: <AccountRegistrationsPage /> },
      { path: "registrations/:id", element: <AccountRegistrationDetailPage /> },
      { path: "checkout/:id", element: <AccountCheckoutPage /> },
      { path: "tickets", element: <AccountTicketsPage /> },
      { path: "tickets/:id", element: <AccountTicketDetailPage /> },
      { path: "documents", element: <AccountDocumentsPage /> },
      { path: "notifications", element: <AccountNotificationsPage /> },
      { path: "profile", element: <AccountProfilePage /> },
    ],
  },
  {
    path: "/organizer",
    element: <DashboardShell role="organizer" />,
    children: [
      { index: true, element: <OrganizerDashboardPage /> },
      { path: "onboarding", element: <OrganizerOnboardingPage /> },
      { path: "events", element: <OrganizerEventsPage /> },
      { path: "event-new", element: <EventNewPage /> },
      { path: "event-detail/:id", element: <OrganizerEventDetailPage /> },
      { path: "verifications", element: <OrganizerVerificationsPage /> },
      { path: "participants", element: <OrganizerParticipantsPage /> },
      { path: "checkin", element: <OrganizerCheckinPage /> },
      { path: "announcements", element: <OrganizerAnnouncementsPage /> },
      { path: "finance", element: <OrganizerFinancePage /> },
      { path: "team", element: <OrganizerTeamPage /> },
      { path: "profile", element: <OrganizerProfilePage /> },
    ],
  },
  {
    path: "/admin",
    element: <DashboardShell role="admin" />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "organizations", element: <AdminOrganizationsPage /> },
      { path: "events", element: <AdminEventsPage /> },
      { path: "external-events", element: <AdminExternalEventsPage /> },
      { path: "finance", element: <AdminFinancePage /> },
      { path: "refunds", element: <AdminRefundsPage /> },
      { path: "disputes", element: <AdminDisputesPage /> },
      { path: "users", element: <AdminUsersPage /> },
      { path: "audit", element: <AdminAuditPage /> },
    ],
  },
])