"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { grantRole } from "@/lib/actions/admin/misc";
import { adminBtn } from "./ui";

export function TeamForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await grantRole(email, role); if (!r.ok) return void toast.error(r.error); toast.success("Role granted"); setEmail(""); router.refresh(); }); }}>
      <div><label htmlFor="team-email" className="mb-1 block text-xs text-white/50">Account email</label><input id="team-email" type="email" required className="field h-10 w-64" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label htmlFor="team-role" className="mb-1 block text-xs text-white/50">Role</label><select id="team-role" className="field h-10 w-40" value={role} onChange={(e) => setRole(e.target.value)}><option value="admin">Admin</option><option value="editor">Editor</option><option value="coach">Coach</option><option value="owner">Owner</option></select></div>
      <button type="submit" disabled={pending} className={adminBtn.primary}>Grant role</button>
    </form>
  );
}
