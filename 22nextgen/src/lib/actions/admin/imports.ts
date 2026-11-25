"use server";

import { z } from "zod";
import { assertCapability } from "@/lib/auth";
import { fail, okData, okay, type ActionResult } from "@/lib/actions/result";
import { revalidatePublic } from "./revalidate";
import { dbError, guardError } from "./common";
import { MAX_IMPORT_BYTES, parseSpreadsheet } from "@/lib/import/parse";
import { autoDetectMapping, type ImportKind, type Mapping } from "@/lib/import/fields";
import { buildPreview } from "@/lib/import/preview";
import type { TestTypeRange } from "@/lib/import/normalize";
import type { MatchableAthlete } from "@/lib/matching";

const CHUNK = 500;
const kindSchema = z.enum(["athletes", "combine_results"]);
const sourceSchema = z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9 _.-]+$/, "Use letters, numbers, spaces, dashes or underscores.");

async function loadTests(supabase: Awaited<ReturnType<typeof assertCapability>>["supabase"]): Promise<(TestTypeRange & { decimals: number })[]> {
  const { data } = await supabase.from("combine_test_types").select("slug, name, unit, min_value, max_value, decimals").eq("active", true).order("sort_order");
  return (data ?? []).map((t) => ({ ...t, min_value: Number(t.min_value), max_value: Number(t.max_value) }));
}

export type StageResult = { batchId: string } | { needsSheet: string[] };

export async function stageImport(formData: FormData): Promise<ActionResult<StageResult>> {
  try {
    const { supabase, user } = await assertCapability("imports.manage");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Choose a .xlsx or .csv file.");
    if (file.size > MAX_IMPORT_BYTES) return fail("The file is larger than 5 MB.");
    const kind = kindSchema.safeParse(formData.get("kind"));
    if (!kind.success) return fail("Choose what you are importing.");
    const source = sourceSchema.safeParse(String(formData.get("source_system") ?? "spreadsheet") || "spreadsheet");
    if (!source.success) return fail(source.error.issues[0].message);
    const eventIdRaw = String(formData.get("event_id") ?? "");
    const eventId = /^[0-9a-f-]{36}$/i.test(eventIdRaw) ? eventIdRaw : null;
    if (kind.data === "combine_results" && !eventId) return fail("Choose the event these results belong to.");

    const parsed = await parseSpreadsheet(new Uint8Array(await file.arrayBuffer()), file.name);
    if (!parsed.ok) return fail(parsed.error);
    const sheetName = String(formData.get("sheet") ?? "");
    let sheet = parsed.sheets.find((s) => s.name === sheetName);
    if (!sheet) {
      if (parsed.sheets.length > 1) return okData({ needsSheet: parsed.sheets.map((s) => s.name) });
      sheet = parsed.sheets[0];
    }
    if (sheet.rows.length === 0) return fail("That sheet has a header row but no data rows.");

    const tests = kind.data === "combine_results" ? await loadTests(supabase) : [];
    const mapping = autoDetectMapping(sheet.headers, kind.data, tests);

    const { data: batch, error } = await supabase
      .from("import_batches")
      .insert({ kind: kind.data, filename: file.name.slice(0, 200), sheet_name: sheet.name, status: "staged", mapping, event_id: eventId, source_system: source.data, row_count: sheet.rows.length, created_by: user.id, summary: { headers: sheet.headers } })
      .select("id")
      .single();
    if (error) return dbError("imports", error, "import");

    const records = sheet.rows.map((cells, i) => ({
      batch_id: batch.id,
      row_number: i + 2,
      raw: Object.fromEntries(sheet.headers.map((h, c) => [h, cells[c] ?? ""])),
    }));
    for (let i = 0; i < records.length; i += CHUNK) {
      const { error: rowError } = await supabase.from("import_rows").insert(records.slice(i, i + CHUNK));
      if (rowError) {
        await supabase.from("import_batches").update({ status: "failed" }).eq("id", batch.id);
        return dbError("imports", rowError, "import");
      }
    }
    return okData({ batchId: batch.id });
  } catch (e) {
    return guardError("imports", e);
  }
}

async function fetchExistingAthletes(supabase: Awaited<ReturnType<typeof assertCapability>>["supabase"], sourceSystem: string): Promise<MatchableAthlete[]> {
  const athletes: MatchableAthlete[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await supabase.from("athletes").select("id, first_name, last_name, graduation_year, team, athlete_private(parent_email)").order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const a of data ?? []) {
      const priv = Array.isArray(a.athlete_private) ? a.athlete_private[0] : a.athlete_private;
      athletes.push({ id: a.id, first_name: a.first_name, last_name: a.last_name, graduation_year: a.graduation_year, team: a.team, parent_email: priv?.parent_email ?? null, external_ids: [] });
    }
    if (!data || data.length < 1000) break;
  }
  const byId = new Map(athletes.map((a) => [a.id, a]));
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await supabase.from("external_record_mappings").select("entity_id, source_system, external_id").eq("source_system", sourceSystem).order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const m of data ?? []) byId.get(m.entity_id)?.external_ids?.push({ source_system: m.source_system, external_id: m.external_id });
    if (!data || data.length < 1000) break;
  }
  return athletes;
}

const mappingSchema = z.record(z.string(), z.string().nullable());

export async function savePreview(batchId: string, mappingInput: unknown, sourceSystemInput?: string): Promise<ActionResult<{ summary: Record<string, number> }>> {
  try {
    const { supabase } = await assertCapability("imports.manage");
    const m = mappingSchema.safeParse(mappingInput);
    if (!m.success) return fail("The column mapping is invalid.");
    const mapping: Mapping = Object.fromEntries(Object.entries(m.data).filter(([, v]) => v));

    const { data: batch } = await supabase.from("import_batches").select("*").eq("id", batchId).single();
    if (!batch) return fail("Import not found.");
    if (batch.status === "applied") return fail("This import has already been applied.");
    if (batch.raw_purged_at) return fail("This import's data was already purged.");
    const kind = batch.kind as ImportKind;
    const headers = ((batch.summary as { headers?: string[] } | null)?.headers ?? []) as string[];
    for (const col of Object.values(mapping)) if (!headers.includes(col as string)) return fail(`Column "${col}" does not exist in the file.`);

    const hasName = Boolean(mapping.first_name && mapping.last_name) || Boolean(mapping.full_name);
    const hasKey = Boolean(mapping.external_id || mapping.athlete_id);
    if (kind === "athletes" && !hasName) return fail("Map first and last name (or a full name column).");
    if (kind === "combine_results" && !hasName && !hasKey) return fail("Map athlete name columns or an ID column so results can be matched.");
    const testSlugs = Object.keys(mapping).filter((k) => k.startsWith("test:"));
    if (kind === "combine_results" && testSlugs.length === 0) return fail("Map at least one test column.");

    const sourceSystem = sourceSystemInput ? sourceSchema.safeParse(sourceSystemInput) : null;
    if (sourceSystem && !sourceSystem.success) return fail(sourceSystem.error.issues[0].message);
    const source = sourceSystem?.success ? sourceSystem.data : batch.source_system;

    const tests = kind === "combine_results" ? await loadTests(supabase) : [];
    const rows: { row_number: number; raw: Record<string, string> }[] = [];
    for (let from = 0; from < 20000; from += 1000) {
      const { data, error } = await supabase.from("import_rows").select("row_number, raw").eq("batch_id", batchId).order("row_number").range(from, from + 999);
      if (error) return dbError("imports", error, "import");
      rows.push(...((data ?? []) as { row_number: number; raw: Record<string, string> }[]));
      if (!data || data.length < 1000) break;
    }
    const athletes = await fetchExistingAthletes(supabase, source);
    const { rows: preview, summary } = buildPreview({ kind, rows, mapping, tests, athletes, sourceSystem: source });

    if (kind === "combine_results" && batch.event_id) {
      const matchedIds = [...new Set(preview.filter((r) => r.matched_athlete_id).map((r) => r.matched_athlete_id as string))];
      const existing = new Set<string>();
      const typeBySlug = new Map((await supabase.from("combine_test_types").select("id, slug")).data?.map((t) => [t.slug, t.id]) ?? []);
      for (let i = 0; i < matchedIds.length; i += 200) {
        const { data } = await supabase.from("combine_results").select("athlete_id, test_type_id, attempt_number, protocol").eq("event_id", batch.event_id).eq("is_current", true).in("athlete_id", matchedIds.slice(i, i + 200));
        for (const e of data ?? []) existing.add(`${e.athlete_id}|${e.test_type_id}|${e.attempt_number}|${e.protocol}`);
      }
      for (const r of preview) {
        const results = (r.normalized.results as { test_slug: string; attempt: number; protocol: string }[] | undefined) ?? [];
        if (r.matched_athlete_id && results.some((x) => existing.has(`${r.matched_athlete_id}|${typeBySlug.get(x.test_slug)}|${x.attempt}|${x.protocol}`))) {
          r.warnings.push("This athlete already has a result for this event/test/protocol. Row will be skipped; use Results → Correct to change it.");
          r.decision = "skip";
        }
      }
    }

    const records = preview.map((r) => ({
      batch_id: batchId,
      row_number: r.row_number,
      normalized: r.normalized,
      errors: r.errors,
      warnings: r.warnings,
      match_status: r.match_status,
      matched_athlete_id: r.matched_athlete_id,
      candidates: r.candidates,
      decision: r.decision,
      decision_athlete_id: null,
      result_status: "pending",
      result_message: null,
    }));
    for (let i = 0; i < records.length; i += CHUNK) {
      const { error } = await supabase.from("import_rows").upsert(records.slice(i, i + CHUNK), { onConflict: "batch_id,row_number" });
      if (error) return dbError("imports", error, "import");
    }
    const { error } = await supabase.from("import_batches").update({ mapping, source_system: source, status: "previewed", summary: { headers, preview: summary } }).eq("id", batchId);
    if (error) return dbError("imports", error, "import");
    return okData({ summary: summary as unknown as Record<string, number> });
  } catch (e) {
    return guardError("imports", e);
  }
}

const decisionSchema = z.object({ rowId: z.string().uuid(), decision: z.enum(["create", "link", "skip"]), athleteId: z.string().uuid().nullable().optional() });

export async function setRowDecision(input: unknown): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("imports.manage");
    const p = decisionSchema.safeParse(input);
    if (!p.success) return fail("Invalid decision.");
    const { rowId, decision, athleteId } = p.data;
    const { data: row } = await supabase.from("import_rows").select("id, batch_id, match_status, candidates, matched_athlete_id").eq("id", rowId).single();
    if (!row) return fail("Row not found.");
    if (row.match_status === "invalid") return fail("Rows with validation errors cannot be imported. Fix the source file and re-upload.");
    const { data: batch } = await supabase.from("import_batches").select("status, kind").eq("id", row.batch_id).single();
    if (!batch || batch.status === "applied") return fail("This import has already been applied.");
    if (decision === "create" && batch.kind !== "athletes") return fail("Result imports cannot create athletes.");
    let target: string | null = null;
    if (decision === "link") {
      const allowed = new Set([row.matched_athlete_id, ...((row.candidates as { athlete_id: string }[]) ?? []).map((c) => c.athlete_id)].filter(Boolean));
      target = athleteId ?? row.matched_athlete_id;
      if (!target || !allowed.has(target)) {
        if (!target) return fail("Choose which existing athlete to link.");
        const { data: exists } = await supabase.from("athletes").select("id").eq("id", target).maybeSingle();
        if (!exists) return fail("That athlete does not exist.");
      }
    }
    const { error } = await supabase.from("import_rows").update({ decision, decision_athlete_id: target }).eq("id", rowId);
    if (error) return dbError("imports", error, "row");
    return okay();
  } catch (e) {
    return guardError("imports", e);
  }
}

export async function applyImport(batchId: string, mode: string, allowOverwrite: boolean): Promise<ActionResult<{ result: Record<string, number> }>> {
  try {
    const { supabase } = await assertCapability("imports.manage");
    const { data, error } = await supabase.rpc("apply_import_batch", { p_batch: batchId, p_mode: mode, p_allow_overwrite: allowOverwrite });
    if (error) return dbError("imports", error, "import");
    revalidatePublic("/athletes", "/combine-results");
    return okData({ result: data as Record<string, number> });
  } catch (e) {
    return guardError("imports", e);
  }
}

export async function purgeImportRaw(batchId: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("imports.manage");
    const { error } = await supabase.rpc("purge_import_raw", { p_batch: batchId });
    if (error) return dbError("imports", error, "import");
    return okay();
  } catch (e) {
    return guardError("imports", e);
  }
}

export async function cancelImport(batchId: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("imports.manage");
    const { data: b } = await supabase.from("import_batches").select("status").eq("id", batchId).single();
    if (!b) return fail("Import not found.");
    if (b.status === "applied") return fail("An applied import cannot be cancelled.");
    const { error } = await supabase.from("import_batches").update({ status: "cancelled" }).eq("id", batchId);
    if (error) return dbError("imports", error, "import");
    await supabase.rpc("purge_import_raw", { p_batch: batchId });
    return okay();
  } catch (e) {
    return guardError("imports", e);
  }
}

export async function saveMappingPreset(kind: string, name: string, mappingInput: unknown): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertCapability("imports.manage");
    const k = kindSchema.safeParse(kind);
    const m = mappingSchema.safeParse(mappingInput);
    const n = z.string().trim().min(1).max(120).safeParse(name);
    if (!k.success || !m.success || !n.success) return fail("Enter a preset name.");
    const mapping = Object.fromEntries(Object.entries(m.data).filter(([, v]) => v));
    const { error } = await supabase.from("field_mapping_presets").upsert({ kind: k.data, name: n.data, mapping, created_by: user.id }, { onConflict: "kind,name" });
    if (error) return dbError("imports", error, "preset");
    return okay();
  } catch (e) {
    return guardError("imports", e);
  }
}

export async function deleteMappingPreset(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("imports.manage");
    const { error } = await supabase.from("field_mapping_presets").delete().eq("id", id);
    if (error) return dbError("imports", error, "preset");
    return okay();
  } catch (e) {
    return guardError("imports", e);
  }
}
