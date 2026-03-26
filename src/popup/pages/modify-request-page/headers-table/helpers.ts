export type HeaderRow = { name: string; value: string };

export const recordToRows = (headers: Record<string, string>): HeaderRow[] =>
  Object.entries(headers).map(([name, value]) => ({ name, value }));

export const rowsToRecord = (rows: HeaderRow[]): Record<string, string> =>
  Object.fromEntries(rows.map((r) => [r.name, r.value]));
