import { BarChart3, CalendarDays, FileText, Gauge, Handshake, Import, Inbox, LayoutDashboard, ListOrdered, Newspaper, Settings, ShieldCheck, Sparkles, Users, ClipboardList } from "lucide-react";
import type { Capability } from "@/lib/permissions";

export const ADMIN_NAV: { href: string; label: string; icon: typeof Gauge; capability: Capability; group: string }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, capability: "dashboard.view", group: "Overview" },
  { href: "/admin/events", label: "Events", icon: CalendarDays, capability: "events.manage", group: "Operations" },
  { href: "/admin/registrations", label: "Registrations", icon: ClipboardList, capability: "registrations.view", group: "Operations" },
  { href: "/admin/athletes", label: "Athletes", icon: Users, capability: "athletes.view", group: "Athletes & Performance" },
  { href: "/admin/imports", label: "Imports", icon: Import, capability: "imports.manage", group: "Athletes & Performance" },
  { href: "/admin/results", label: "Results", icon: Gauge, capability: "results.enter", group: "Athletes & Performance" },
  { href: "/admin/rankings", label: "Rankings", icon: ListOrdered, capability: "rankings.manage", group: "Athletes & Performance" },
  { href: "/admin/news", label: "News", icon: Newspaper, capability: "news.manage", group: "Content" },
  { href: "/admin/sponsors", label: "Sponsors", icon: Handshake, capability: "sponsors.manage", group: "Content" },
  { href: "/admin/content", label: "Site content", icon: FileText, capability: "content.manage", group: "Content" },
  { href: "/admin/memberships", label: "Memberships", icon: Sparkles, capability: "memberships.view", group: "Business" },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox, capability: "registrations.view", group: "Business" },
  { href: "/admin/privacy", label: "Privacy requests", icon: ShieldCheck, capability: "privacy.manage", group: "Business" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, capability: "analytics.view", group: "Business" },
  { href: "/admin/settings", label: "Settings", icon: Settings, capability: "settings.manage", group: "Business" },
];
