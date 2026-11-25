import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";
import { ATHLETE_TEMPLATE_EXAMPLE, ATHLETE_TEMPLATE_HEADERS, RESULT_TEMPLATE_EXAMPLE, RESULT_TEMPLATE_HEADERS } from "@/lib/import/fields";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!can(user.roles, "imports.manage")) return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  const sp = request.nextUrl.searchParams;
  const kind = sp.get("kind") === "combine_results" ? "combine_results" : "athletes";
  const format = sp.get("format") === "csv" ? "csv" : "xlsx";
  const headers = kind === "athletes" ? ATHLETE_TEMPLATE_HEADERS : RESULT_TEMPLATE_HEADERS;
  const example = kind === "athletes" ? ATHLETE_TEMPLATE_EXAMPLE : RESULT_TEMPLATE_EXAMPLE;
  const name = `22nextgen-${kind === "athletes" ? "athlete" : "results"}-import-template`;

  if (format === "csv") {
    const csv = toCsv(headers, [Object.fromEntries(headers.map((h, i) => [h, example[i]]))]);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"`, "Cache-Control": "no-store" } });
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(kind === "athletes" ? "Athletes" : "Results");
  ws.addRow(headers).font = { bold: true };
  ws.addRow(example);
  ws.columns.forEach((c) => (c.width = 18));
  const help = wb.addWorksheet("Instructions");
  help.addRows(
    kind === "athletes"
      ? [
          ["Delete the example row before importing."],
          ["Required: First Name and Last Name (or a single Name column)."],
          ["Optional columns can be removed or left blank. Column names are flexible; you can map them during import."],
          ["Height: 5'10\" or inches. Birth Date, School and Parent columns are private and never shown publicly."],
          ["Imported athletes are private drafts. Consent and approval are required before anything is public."],
        ]
      : [
          ["Delete the example row before importing."],
          ["Identify each athlete with an External ID or First/Last Name (athletes must already exist)."],
          ["Times in seconds (e.g. 4.95). Vertical and broad jump in inches, or feet-inches like 7'2\"."],
          ["Protocol: use the same label for the same timing method, e.g. laser or hand. Results import as unverified."],
        ],
  );
  help.getColumn(1).width = 110;
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}.xlsx"`, "Cache-Control": "no-store" } });
}
