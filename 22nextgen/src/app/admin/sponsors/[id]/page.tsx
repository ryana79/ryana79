import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/ui";
import { SponsorForm } from "@/components/admin/sponsor-form";

export default async function EditSponsorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("sponsors.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: s } = await supabase.from("sponsors").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  return (
    <div>
      <AdminPageHeader title={s.name} backHref="/admin/sponsors" />
      <SponsorForm sponsorId={id} initial={{ name: s.name, website_url: s.website_url ?? "", description: s.description ?? "", tier: s.tier, category: s.category ?? "", logo_path: s.logo_path ?? "", featured: s.featured, active: s.active, sort_order: String(s.sort_order) }} />
    </div>
  );
}
