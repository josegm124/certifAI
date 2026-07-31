import { NavLink, Link } from "react-router-dom";
import Logo from "./Logo";

export default function Header() {
  return (
    <header className="hdr">
      <div className="hdr-in">
        <Link to="/" className="brand" aria-label="CertifAI home">
          <Logo />
          <span className="brand-txt">CertifAI</span>
          <span className="brand-sub">AI Governance Readiness</span>
        </Link>
        <nav className="hdr-nav">
          <NavLink to="/dashboard" className="hdr-link">Dashboard</NavLink>
          <NavLink to="/assess" className="hdr-link">Assessment</NavLink>
          <NavLink to="/results" className="hdr-link">Results</NavLink>
          <Link to="/start" className="btn btn-primary hdr-cta">Start free assessment</Link>
        </nav>
      </div>
    </header>
  );
}
