export const BRAND = {
  name: "22 NEXT GEN",
  slogan: "THE FUTURE STARTS HERE.",
  tagline: "Compete. Develop. Get Discovered.",
  company: "22 Fitness LLC",
  domain: "22nextgen.com",
  description:
    "22 NEXT GEN is a New Jersey youth football events, athlete exposure and combine performance platform powered by 22 Fitness LLC.",
} as const;

export type NavItem = { label: string; href: string; children?: { label: string; href: string; description?: string }[] };

export const NAV: NavItem[] = [
  { label: "Events", href: "/events" },
  {
    label: "Athletes",
    href: "/athletes",
    children: [
      { label: "Athlete Directory", href: "/athletes", description: "Approved public athlete profiles" },
      { label: "Combine Results", href: "/combine-results", description: "Verified performance leaderboards" },
      { label: "Rankings", href: "/rankings", description: "Editorial rankings by 22 NEXT GEN" },
    ],
  },
  { label: "News", href: "/news" },
  { label: "NEXT GEN+", href: "/membership" },
  { label: "Partners", href: "/partners" },
  {
    label: "About",
    href: "/about",
    children: [
      { label: "About 22 NEXT GEN", href: "/about", description: "Our mission and approach" },
      { label: "Contact", href: "/contact", description: "Reach the team" },
    ],
  },
];

export const EVENT_TYPES = [
  { value: "combine", label: "Combine" },
  { value: "showcase", label: "Showcase" },
  { value: "camp", label: "Development Camp" },
  { value: "clinic", label: "Clinic" },
  { value: "skills_session", label: "Skills Session" },
  { value: "other", label: "Event" },
] as const;

export const REGISTRATION_STATUSES = [
  { value: "coming_soon", label: "Coming Soon" },
  { value: "open", label: "Registration Open" },
  { value: "waitlist", label: "Waitlist" },
  { value: "sold_out", label: "Sold Out" },
  { value: "closed", label: "Registration Closed" },
] as const;

export const ARTICLE_CATEGORIES = [
  { value: "athlete_spotlight", label: "Athlete Spotlight" },
  { value: "combine_recap", label: "Combine Recap" },
  { value: "interview", label: "Interview" },
  { value: "football_news", label: "Football News" },
  { value: "event_announcement", label: "Event Announcement" },
  { value: "rankings_update", label: "Rankings Update" },
  { value: "development", label: "Development" },
] as const;

export const SPONSOR_TIERS = [
  { value: "presenting", label: "Presenting" },
  { value: "title", label: "Title" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "bronze", label: "Bronze" },
  { value: "community", label: "Community" },
  { value: "partner", label: "Partner" },
] as const;

export const POSITIONS = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "CB", "S", "K/P", "ATH"] as const;

export const REGIONS = ["North Jersey", "Central Jersey", "South Jersey", "Shore", "New York", "Pennsylvania", "Northeast", "National"] as const;

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
] as const;

export const labelFor = (list: readonly { value: string; label: string }[], value: string | null | undefined) =>
  list.find((i) => i.value === value)?.label ?? value ?? "";
