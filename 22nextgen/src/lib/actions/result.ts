export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const fail = (error: string, fieldErrors?: Record<string, string[]>): { ok: false; error: string; fieldErrors?: Record<string, string[]> } => ({ ok: false, error, fieldErrors });
export const okay = (): { ok: true } => ({ ok: true });
export const okData = <T,>(data: T): { ok: true; data: T } => ({ ok: true, data });
