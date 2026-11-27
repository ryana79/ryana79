import { revalidatePath } from "next/cache";

/** Public pages are ISR-cached; admin edits invalidate them immediately. */
export function revalidatePublic(...paths: string[]) {
  revalidatePath("/", "layout");
  for (const p of paths) revalidatePath(p);
}
