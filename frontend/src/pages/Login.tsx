import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login, getActiveAssessment } from "../lib/api";
import { useStore } from "../store/useStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { setAuth, setAssessment } = useStore();
  const nav = useNavigate();
  const location = useLocation();

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const { profile } = await login(email, password);
      setAuth(profile);
      const { assessment } = await getActiveAssessment();
      setAssessment(assessment);
      const target = (location.state as { from?: string } | null)?.from;
      nav(target || (assessment ? "/assess" : "/dashboard"), { replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : "Login failed"); }
    finally { setBusy(false); }
  }

  return <main className="wrap"><form className="card" style={{ maxWidth: 520, margin: "0 auto" }} onSubmit={submit}>
    <div className="eyebrow">Account</div><h1 className="h2">Welcome back</h1>
    <div className="field"><label className="lbl" htmlFor="login-email">Work email</label><input id="login-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
    <div className="field"><label className="lbl" htmlFor="login-password">Password</label><input id="login-password" className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
    {error && <div className="banner banner-cap">{error}</div>}
    <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    <p className="sec-note" style={{ marginTop: 10 }}>No account yet? <Link to="/register">Create one</Link></p>
  </form></main>;
}
