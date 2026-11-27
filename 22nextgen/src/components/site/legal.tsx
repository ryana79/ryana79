import { AlertTriangle } from "lucide-react";

export function LegalNotice() {
  return (
    <div className="mb-10 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100" role="note">
      <AlertTriangle className="mt-0.5 size-5 shrink-0" />
      <p><strong>Draft for legal review.</strong> This page is a working draft prepared for 22 Fitness LLC. It has not been reviewed by qualified legal counsel and must be reviewed (including COPPA, state privacy law, consent language and data-retention terms) before the site launches publicly.</p>
    </div>
  );
}
