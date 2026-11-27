/** Product decision (document for counsel): are athlete profile pages indexable by search engines? Default NO. */
export function isAthleteIndexable(): boolean {
  return process.env.ATHLETE_PROFILES_INDEXABLE === "true";
}
