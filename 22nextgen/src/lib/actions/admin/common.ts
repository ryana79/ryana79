import { ForbiddenError } from "@/lib/auth";
import { fail } from "@/lib/actions/result";

export function guardError(scope: string, e: unknown) {
  if (e instanceof ForbiddenError) return fail(e.message);
  console.error(`[admin/${scope}]`, e instanceof Error ? e.message : "unknown error");
  return fail("Something went wrong. Please try again.");
}

export function dbError(scope: string, error: { code?: string; message: string }, what = "record") {
  if (error.code === "23505") return fail(`That ${what} conflicts with an existing one (duplicate).`, { slug: ["That slug is already in use."] });
  if (error.code === "42501") return fail("You do not have permission to do that.");
  if (error.code === "23503") return fail(`This ${what} is referenced by other records and cannot be removed.`);
  if (error.code === "23514" || error.code === "P0001") return fail(error.message.slice(0, 240));
  console.error(`[admin/${scope}] db error`, error.code, error.message);
  return fail("The database rejected this change. Please review the fields and try again.");
}
