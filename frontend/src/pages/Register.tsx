import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../lib/api";
import { useStore } from "../store/useStore";

const ROLES = ["Compliance / Risk", "Data Protection / Privacy (DPO)", "Security (CISO)", "Executive / Leadership", "Other"];

export default function Register() {
  const [form, setForm] = useState({ companyName: "", name: "", email: "", role: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setAuth = useStore((state) => state.setAuth);
  const nav = useNavigate();
  const passwordValid = form.password.length >= 6 && /[A-Z]/.test(form.password) && /[0-9]/.test(form.password);
  const field = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: event.target.value });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!passwordValid) { setError("Use at least 6 characters, one uppercase letter, and one number."); return; }
    setBusy(true); setError(null);
    try { const { profile } = await register(form); setAuth(profile); nav("/start", { replace: true }); }
    catch (err) { setError(err instanceof Error ? err.message : "Registration failed"); }
    finally { setBusy(false); }
  }
  return <main className="wrap"><form className="card" style={{ maxWidth: 620, margin: "0 auto" }} onSubmit={submit}>
    <div className="eyebrow">Create account</div><h1 className="h2">Organisation details</h1>
    <p className="sec-note">For this MVP, one organisation has one account and one unique work email.</p>
    <div className="field"><label className="lbl">Organisation name</label><input className="input" required value={form.companyName} onChange={field("companyName")} /></div>
    <div className="field"><label className="lbl">Your full name</label><input className="input" required value={form.name} onChange={field("name")} /></div>
    <div className="field"><label className="lbl">Work email</label><input className="input" type="email" required value={form.email} onChange={field("email")} /></div>
    <div className="field"><label className="lbl">Professional role</label><select className="input" required value={form.role} onChange={field("role")}><option value="" disabled>Select your role</option>{ROLES.map((role) => <option key={role}>{role}</option>)}</select></div>
    <div className="field"><label className="lbl">Password</label><input className={`input ${form.password && !passwordValid ? "input-err" : ""}`} type="password" minLength={6} maxLength={200} pattern="(?=.*[A-Z])(?=.*[0-9]).{6,200}" required value={form.password} onChange={field("password")} aria-invalid={Boolean(form.password) && !passwordValid} /><div className="sec-note" style={{ marginTop: 6 }}>At least 6 characters, one uppercase letter, and one number.</div></div>
    {error && <div className="banner banner-cap">{error}</div>}
    <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
    <p className="sec-note" style={{ marginTop: 10 }}>Already registered? <Link to="/login">Sign in</Link></p>
  </form></main>;
}
