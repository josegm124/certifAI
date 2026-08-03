import { FormEvent, useEffect, useState } from "react";
import { updateProfile } from "../lib/api";
import { useStore } from "../store/useStore";

export default function Profile() {
  const { profile, setAuth } = useStore();
  const [name, setName] = useState(profile?.name || "");
  const [role, setRole] = useState(profile?.role || "");
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { setName(profile?.name || ""); setRole(profile?.role || ""); }, [profile]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setNote(null);
    try { const { profile: updated } = await updateProfile(name, role); setAuth(updated); setNote("Profile saved."); }
    catch (err) { setNote(err instanceof Error ? err.message : "Could not save profile"); }
  }
  return <main className="wrap"><form className="card" style={{ maxWidth: 620, margin: "0 auto" }} onSubmit={submit}>
    <div className="eyebrow">Profile</div><h1 className="h2">Account details</h1>
    <div className="field"><label className="lbl">Organisation</label><input className="input" disabled value={profile?.company.name || ""} /></div>
    <div className="field"><label className="lbl">Work email</label><input className="input" disabled value={profile?.email || ""} /></div>
    <div className="field"><label className="lbl">Your full name</label><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></div>
    <div className="field"><label className="lbl">Professional role</label><input className="input" required value={role} onChange={(e) => setRole(e.target.value)} /></div>
    {note && <div className="sec-note">{note}</div>}
    <button className="btn btn-primary">Save profile</button>
  </form></main>;
}
