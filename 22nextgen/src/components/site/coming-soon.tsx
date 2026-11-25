export function DashboardComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h1 className="font-display text-5xl font-extrabold uppercase tracking-wide">{title}</h1>
      <div className="mt-6 max-w-2xl rounded-xl border border-white/10 bg-[#111113] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Coming in a later phase</p>
        <p className="mt-2 text-white/70">{body}</p>
        <p className="mt-4 text-sm text-white/45">The data model for this area (guardians, guardian-athlete links, memberships and consent history) is already in the database. The family-facing interface has not been built yet.</p>
      </div>
    </section>
  );
}
