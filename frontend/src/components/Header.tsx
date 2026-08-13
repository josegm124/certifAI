import { NavLink, Link } from "react-router-dom";
import Logo from "./Logo";
import { logout } from "../lib/api";
import { useStore } from "../store/useStore";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const { authStatus, reset } = useStore();
  const nav = useNavigate();
  async function signOut() { try { await logout(); } finally { reset(); nav("/"); } }
  return (
    <header className="hdr">
      <div className="hdr-in">
        <Link to="/" className="brand" aria-label="CertifAI home">
          <Logo />
          <span className="brand-txt">CertifAI</span>
          <span className="brand-sub">AI Governance Readiness</span>
        </Link>
        <nav className="hdr-nav">
          {authStatus === "authenticated" ? <>
            <NavLink to="/dashboard" className="hdr-link">Dashboard</NavLink>
            <NavLink to="/assess" className="hdr-link">Assessment</NavLink>
            <NavLink to="/profile" className="hdr-link">Profile</NavLink>
            <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
          </> : <>
            <NavLink to="/login" className="hdr-link">Sign in</NavLink>
            <Link to="/register" className="btn btn-primary hdr-cta">Create account</Link>
          </>}
        </nav>
      </div>
    </header>
  );
}
