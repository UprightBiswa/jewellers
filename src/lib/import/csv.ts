/**
 * CSV, to the letter of RFC 4180.
 *
 * `text.split(",")` is wrong for this file. A product description contains
 * commas, a Bengali name can contain quotes, and Excel writes CRLF and a
 * byte-order mark. All three appear in the very first sheet Rahul sends.
 *
 * Small enough to own rather than add a dependency for, and the awkward cases
 * are covered by tests in scripts/test-import.mjs.
 */

/** Rows of fields. Quotes are removed, `""` becomes `"`, CRLF becomes nothing. */
export function parseCsv(input: string): string[][] {
  // Excel prepends a BOM. Left in place it becomes part of the first header
  // name, and every lookup for "serial" silently misses.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        // A doubled quote inside a quoted field is a literal quote.
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        // Newlines inside quotes belong to the field — this is why a
        // line-by-line parser cannot work.
        field += c;
      }
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }

  // A file that does not end in a newline still has a last row.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** Header row plus objects keyed by column name, blank rows dropped. */
export function parseCsvRecords(input: string): {
  headers: string[];
  records: { line: number; values: Record<string, string> }[];
} {
  const rows = parseCsv(input);
  if (rows.length === 0) return { headers: [], records: [] };

  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const records: { line: number; values: Record<string, string> }[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    // A sheet exported from Excel usually carries a few empty rows at the end.
    if (cells.every((c) => c.trim() === "")) continue;

    const values: Record<string, string> = {};
    headers.forEach((h, i) => {
      values[h] = (cells[i] ?? "").trim();
    });
    records.push({ line: r + 1, values });
  }

  return { headers, records };
}

/** Quote only where the standard requires it, so the file stays readable. */
function escapeField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeField).join(",")];
  for (const row of rows) {
    lines.push(row.map((v) => escapeField(v == null ? "" : String(v))).join(","));
  }
  // A BOM, so Excel opens Bengali text as UTF-8 instead of mojibake.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
