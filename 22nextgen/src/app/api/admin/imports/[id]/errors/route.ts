import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!can(user.roles, "imports.manage")) return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  const supabase = await createClient();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase.from("import_rows").select("row_number, normalized, errors, warnings, match_status, decision, result_status, result_message").eq("batch_id", id).order("row_number").range(from, from + 999);
    if (error) return NextResponse.json({ error: "Could not load rows." }, { status: 500 });
    for (const r of data ?? []) {
      if (r.errors.length || r.result_status === "failed" || r.result_status === "skipped" || r.match_status === "ambiguous" || r.match_status === "duplicate_in_file") {
        const n = r.normalized as Record<string, unknown>;
        rows.push({ row: r.row_number, name: [n.first_name, n.last_name].filter(Boolean).join(" "), match_status: r.match_status, decision: r.decision, result: r.result_status, message: [...(r.errors as string[]), r.result_message].filter(Boolean).join(" | "), warnings: (r.warnings as string[]).join(" | ") });
      }
    }
    if (!data || data.length < 1000) break;
  }
  return new NextResponse(toCsv(["row", "name", "match_status", "decision", "result", "message", "warnings"], rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="import-${id.slice(0, 8)}-issues.csv"`, "Cache-Control": "no-store" },
  });
}
