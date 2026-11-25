import ExcelJS from "exceljs";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 10000;
export const MAX_IMPORT_COLUMNS = 100;

export type ParsedSheet = { name: string; headers: string[]; rows: string[][] };
export type ParseResult = { ok: true; sheets: ParsedSheet[] } | { ok: false; error: string };

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, CRLF/LF, embedded newlines). */
export function parseCsvText(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") inQuotes = true;
    else if (ch === ",") pushCell();
    else if (ch === "\n") pushRow();
    else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      pushRow();
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) pushRow();
  return rows;
}

/** Convert an ExcelJS cell value to plain text. Formulas are never evaluated; the cached result is used. */
export function cellToString(value: ExcelJS.CellValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const v = value as unknown as Record<string, unknown>;
    if ("richText" in v && Array.isArray(v.richText)) return (v.richText as { text: string }[]).map((t) => t.text).join("").trim();
    if ("result" in v) return cellToString(v.result as ExcelJS.CellValue);
    if ("text" in v && typeof v.text === "string") return v.text.trim();
    if ("hyperlink" in v && typeof v.hyperlink === "string") return v.hyperlink.trim();
    if ("error" in v) return "";
  }
  return "";
}

function tidy(rows: string[][]): ParsedSheet["rows"] {
  return rows.map((r) => r.map((c) => c.trim()));
}

function toSheet(name: string, matrix: string[][]): ParsedSheet | null {
  const rows = tidy(matrix).filter((r) => r.some((c) => c !== ""));
  if (rows.length === 0) return null;
  const width = Math.min(MAX_IMPORT_COLUMNS, Math.max(...rows.map((r) => r.length)));
  const seen = new Map<string, number>();
  const headers = Array.from({ length: width }, (_, i) => {
    const base = (rows[0][i] ?? "").trim() || `Column ${i + 1}`;
    const n = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), n);
    return n === 1 ? base : `${base} (${n})`;
  });
  const body = rows.slice(1).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));
  return { name, headers, rows: body };
}

function looksLikeZip(buf: Uint8Array) {
  return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;
}

export async function parseSpreadsheet(buffer: Uint8Array, filename: string): Promise<ParseResult> {
  if (buffer.byteLength === 0) return { ok: false, error: "The file is empty." };
  if (buffer.byteLength > MAX_IMPORT_BYTES) return { ok: false, error: "The file is larger than 5 MB." };
  const lower = filename.toLowerCase();
  try {
    if (lower.endsWith(".csv")) {
      const text = new TextDecoder("utf-8").decode(buffer);
      const sheet = toSheet("CSV", parseCsvText(text));
      if (!sheet) return { ok: false, error: "No data found in the CSV." };
      if (sheet.rows.length > MAX_IMPORT_ROWS) return { ok: false, error: `The sheet has more than ${MAX_IMPORT_ROWS} rows. Split it into smaller files.` };
      return { ok: true, sheets: [sheet] };
    }
    if (lower.endsWith(".xlsx")) {
      if (!looksLikeZip(buffer)) return { ok: false, error: "This does not look like a valid .xlsx file." };
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(Buffer.from(buffer) as unknown as ExcelJS.Buffer);
      const sheets: ParsedSheet[] = [];
      for (const ws of wb.worksheets) {
        if (ws.state !== "visible") continue;
        const matrix: string[][] = [];
        const maxRow = Math.min(ws.rowCount, MAX_IMPORT_ROWS + 50);
        for (let r = 1; r <= maxRow; r++) {
          const row = ws.getRow(r);
          const cells: string[] = [];
          const maxCol = Math.min(ws.columnCount, MAX_IMPORT_COLUMNS);
          for (let c = 1; c <= maxCol; c++) cells.push(cellToString(row.getCell(c).value));
          matrix.push(cells);
        }
        const sheet = toSheet(ws.name, matrix);
        if (sheet) {
          if (sheet.rows.length > MAX_IMPORT_ROWS) return { ok: false, error: `Sheet "${ws.name}" has more than ${MAX_IMPORT_ROWS} rows. Split it into smaller files.` };
          sheets.push(sheet);
        }
      }
      if (sheets.length === 0) return { ok: false, error: "No data found in the workbook." };
      return { ok: true, sheets };
    }
    return { ok: false, error: "Only .xlsx and .csv files are supported. Legacy .xls files must be re-saved as .xlsx." };
  } catch {
    return { ok: false, error: "The file could not be read. Make sure it is a valid, unprotected .xlsx or .csv file." };
  }
}
