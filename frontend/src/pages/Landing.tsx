import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DOMAINS, FRAMEWORKS, DOMAIN_SHORT,
  TOTAL_QUESTIONS, TOTAL_DOMAINS, MAX_SCORE, CANONICAL_SENTENCE,
  numberWord, NumberWord,
} from "../lib/data";
import LadderVis from "../components/LadderVis";
import RadarChart, { type RadarPoint } from "../components/RadarChart";
import { Check, Arrow, Sparkle } from "../components/icons";
import { useStore } from "../store/useStore";
import { SAMPLE_ANSWERS } from "../lib/sampleData";
import { domainScores, LEVELS } from "../lib/scoring";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

export default function Landing() {
  const nav = useNavigate();
  const loadSample = useStore((s) => s.loadSample);

  // DOMAIN_SHORT is owned by data.ts — the local copy here was missing
  // "revenue", so the radar drew nine axes with only eight labelled.
  const preview: RadarPoint[] = domainScores(SAMPLE_ANSWERS).map((d) => ({
    id: d.id, label: d.name, short: DOMAIN_SHORT[d.id], pct: d.pct,
  }));

  return (
    <main>
      <div className="wrap wrap-wide">
        {/* hero */}
        <section className="hero">
          <motion.div {...fadeUp}>
            <div className="eyebrow">EU AI Act · {TOTAL_DOMAINS} domains · {TOTAL_QUESTIONS} questions</div>
            <h1 className="h1">Know exactly where your AI governance stands, and prove it.</h1>
            <p className="lead">
              A structured readiness assessment for organisations deploying AI under the EU AI Act.
              Score {CANONICAL_SENTENCE}.
              See where you stand by domain and by framework, then attach evidence and earn a trust
              level you can show.
            </p>
            <div className="hero-cta">
              <Link to="/start" className="btn btn-primary btn-lg">Start free assessment <Arrow color="#fff" /></Link>
              <button className="btn btn-ghost btn-lg" onClick={() => { loadSample(); nav("/dashboard"); }}>
                See a live dashboard
              </button>
            </div>
            <div className="hero-trust"><Check /> Free to assess · organisation, work email and role to begin · no payment</div>
          </motion.div>
          <motion.div className="hero-art" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <div className="card">
              <div className="card-h"><span className="card-t">Governance maturity</span><span className="card-sub">sample</span></div>
              <RadarChart data={preview} benchmark={LEVELS[2].max} benchmarkLabel="Assured target" linkBase={null} />
            </div>
          </motion.div>
        </section>

        {/* 4A ladder */}
        <motion.section {...fadeUp} style={{ marginTop: 34 }}>
          <div className="eyebrow">The 4A ladder</div>
          <h2 className="h2">Four levels of earned trust.</h2>
          <p className="sec-note">Each level is earned per certification from your score, evidence and self-certification, with critical controls gating the top.</p>
          <LadderVis />
        </motion.section>

        {/* domain strip */}
        <motion.section {...fadeUp} style={{ marginTop: 38 }}>
          <h2 className="h2">{NumberWord(TOTAL_DOMAINS)} weighted governance domains.</h2>
          <div className="dstrip">
            {DOMAINS.map((d) => (
              <div key={d.id} className="dstrip-item">
                <span className="dstrip-w">{Math.round(d.weight * 100)}%</span>
                <span className="dstrip-n">{d.name}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* frameworks */}
        <motion.section {...fadeUp} style={{ marginTop: 30 }}>
          <div className="eyebrow">Mapped to the frameworks you are measured against</div>
          <div className="fwrow">
            {(Object.entries(FRAMEWORKS) as [string, string][]).map(([k, f]) => (
              <Link key={k} to={`/certifications/${k}`} className="fwchip" style={{ cursor: "pointer" }}>{f}</Link>
            ))}
          </div>
        </motion.section>

        {/* how it works */}
        <motion.section {...fadeUp} style={{ marginTop: 40 }}>
          <h2 className="h2">How it works.</h2>
          <div className="how">
            {[
              { t: "Assess", d: `Answer ${TOTAL_QUESTIONS} questions on a 0 to ${MAX_SCORE} maturity scale across all ${numberWord(TOTAL_DOMAINS)} domains.` },
              { t: "Add evidence", d: "Attach documents and written detail to each control to build an audit-ready record." },
              { t: "AI review, in development", d: "Automated review of your evidence against each control, with a suggested score and drafted remediation. Not available in this build." },
              { t: "Earn your level", d: "Sign your self-certification and earn Aligned, Assured or Advanced, a badge you can share." },
            ].map((s, i) => (
              <div key={s.t} className="how-step">
                <div className="how-num">{i + 1}</div>
                <div className="how-t">{s.t}</div>
                <div className="how-d">{s.d}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* pricing */}
        <motion.section {...fadeUp} style={{ marginTop: 40 }}>
          <h2 className="h2">Start free. Certify when you're ready.</h2>
          <div className="pricing">
            <div className="price">
              <div className="price-tag">Free · Tier 1</div>
              <div className="price-name">Readiness Snapshot</div>
              <div className="price-cost"><b>€0</b> · self-scored</div>
              <ul className="plist">
                {[`All ${TOTAL_QUESTIONS} questions, self-scored`, "Maturity by domain + framework", "Interactive dashboard & deep-dives", "Prioritised gap profile", "Your Aware baseline, for internal use"].map((p) => (
                  <li key={p}><Check /> {p}</li>
                ))}
              </ul>
              <Link to="/start" className="btn btn-primary" style={{ width: "100%" }}>Start free assessment</Link>
            </div>
            <div className="price price-accent">
              <div className="price-tag">Paid · Tier 2</div>
              <div className="price-name">Evidence-Based Certification</div>
              <div className="price-cost"><b>€</b> · per certification</div>
              <ul className="plist">
                {["Everything in the free tier", "Per-control document upload", "AI evidence review and scoring, in development", "Virtual signature + self-certification", "Earn Aligned / Assured / Advanced", "Verifiable, shareable trust badge"].map((p) => (
                  <li key={p}><Sparkle size={15} color="var(--ocean)" /> {p}</li>
                ))}
              </ul>
              <Link to="/start" className="btn btn-accent" style={{ width: "100%" }}>Begin certification</Link>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
