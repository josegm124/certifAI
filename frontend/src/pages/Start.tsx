/* ==============================================================================
   Start — the intake gate.

   WHY THIS PAGE EXISTS
   v2 had no intake gate at all. It collected an organisation name from a
   sidebar input on the assessment page itself, and nothing else — no work
   email, no role, at any point in the flow. `setEmail` existed in the store but
   was never called by any component, so every lead reached the backend as a
   synthetic `demo+<timestamp>@certifai.local` address.

   The free tier is the top of the funnel. A funnel that captures no contact
   detail does not function as one, and nobody should answer 36 questions
   anonymously. This sits between the landing page and the first question.

   Ported from Jose's Intro screen in legacy-frontend/CertifAI_MVP.jsx, which
   already did this well. His wording is kept where it works; counts are derived
   from data.ts rather than typed.
   ============================================================================== */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TOTAL_QUESTIONS, TOTAL_DOMAINS, TOTAL_FRAMEWORKS, MAX_SCORE, numberWord,
} from "../lib/data";
import { useStore } from "../store/useStore";
import { registerLead, createAssessment } from "../lib/api";
import { completion } from "../lib/scoring";
import { Check, Arrow } from "../components/icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lead-qualification roles, from Jose's build. Last option is the catch-all.
const ROLES = [
  "Compliance / Risk",
  "Data Protection / Privacy (DPO)",
  "Security (CISO)",
  "Executive / Leadership",
  "Other",
];

export default function Start() {
  const nav = useNavigate();
  const { org, setOrg, email, setEmail, role, setRole, setTier, setIdentity, answers } = useStore();
  const [picked, setPicked] = useState<1 | 2 | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email.trim());
  const canStart = Boolean(org.trim() && emailValid && role.trim());

  // v2 persists to localStorage, so "resume" means picking up saved answers in
  // this browser rather than importing a file. See MANIFEST note.
  const saved = completion(answers);
  const hasSaved = saved.answered > 0;

  async function start(tier: 1 | 2) {
    if (!canStart || busy) return;
    setBusy(true);
    setNote(null);
    setTier(tier);
    try {
      // Register the lead NOW, not at signing time. Capturing the contact only
      // if someone finishes and signs would miss everyone who abandons, which
      // is most of a funnel.
      const lead = await registerLead(org.trim(), email.trim(), role.trim());
      const assessmentId = await createAssessment(lead.userId, tier);
      setIdentity(lead.userId, assessmentId);
    } catch {
      // The app stays usable with the backend down; the lead is re-registered
      // on submit. Say so rather than blocking the assessment.
      setNote("Saved locally — the assessment service is unreachable, so your details will sync when you submit.");
    } finally {
      setBusy(false);
      nav("/assess");
    }
  }

  return (
    <main className="wrap wrap-wide">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="eyebrow">EU AI Act · {TOTAL_DOMAINS} domains · {TOTAL_QUESTIONS} controls</div>
        <h1 className="h1">Know exactly where your AI governance stands.</h1>
        <p className="lead" style={{ maxWidth: "64ch" }}>
          A structured readiness assessment for organisations deploying AI under the EU AI Act.
          Answer {TOTAL_QUESTIONS} questions across {numberWord(TOTAL_DOMAINS)} governance domains,
          mapped to {TOTAL_FRAMEWORKS} regulatory frameworks and scored on a 0 to {MAX_SCORE} maturity
          scale. See your maturity by domain and framework, and get a prioritised remediation path —
          in about 20 minutes.
        </p>
      </motion.div>

      <div className="start-grid">
        {/* ---- details ---- */}
        <motion.section className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}>
          <div className="card-h"><span className="card-t">Your details</span><span className="card-sub">all three required</span></div>

          <div className="field">
            <label className="lbl" htmlFor="org">Organisation name</label>
            <input id="org" className="input" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Northstar Recruitment AI" />
          </div>

          <div className="field">
            <label className="lbl" htmlFor="email">Work email</label>
            <input
              id="email" type="email"
              className={`input ${email && !emailValid ? "input-err" : ""}`}
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="jane.doe@northstar.com"
              aria-invalid={Boolean(email) && !emailValid}
            />
            {email && !emailValid && <div className="field-err">Enter a valid work email address.</div>}
          </div>

          <div className="field">
            <label className="lbl" htmlFor="role">Your role</label>
            <select id="role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="" disabled>Select your role</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {hasSaved && (
            <div className="sec-note" style={{ marginTop: 14 }}>
              You have {saved.answered} of {saved.total} controls saved in this browser.{" "}
              <Link to="/assess" className="finish-link">Resume that assessment →</Link>
            </div>
          )}
          {note && <div className="sec-note" style={{ marginTop: 10 }}>{note}</div>}
        </motion.section>

        {/* ---- tier choice, made before starting ---- */}
        <motion.section className="pricing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <TierCard
            active={picked === 1} onSelect={() => setPicked(1)}
            tag="Tier 1 · Free" name="Readiness Snapshot"
            points={[
              `Self-scored across all ${TOTAL_QUESTIONS} controls`,
              "Maturity by domain + framework",
              "Prioritised gap profile",
              "No badge issued",
            ]}
            cta="Start free assessment"
            onStart={() => start(1)} disabled={!canStart || busy} busy={busy}
          />
          <TierCard
            active={picked === 2} onSelect={() => setPicked(2)} accent
            tag="Tier 2 · Evidence" name="Evidence & Badge"
            points={[
              "Everything in Tier 1",
              "Attest + note evidence per control",
              "Earn Aligned, Assured or Advanced",
              "Audit-ready evidence record",
            ]}
            cta="Start with evidence"
            onStart={() => start(2)} disabled={!canStart || busy} busy={busy}
          />
        </motion.section>
      </div>

      <p className="disclaimer">
        CertifAI produces a self-assessed, AI-assisted, evidence-backed readiness signal — not a
        certification, legal advice, or a conformity assessment under the EU AI Act.
      </p>
    </main>
  );
}

function TierCard({
  active, onSelect, tag, name, points, cta, onStart, disabled, busy, accent,
}: {
  active: boolean; onSelect: () => void; tag: string; name: string; points: string[];
  cta: string; onStart: () => void; disabled: boolean; busy: boolean; accent?: boolean;
}) {
  return (
    <div className={`price ${accent ? "price-accent" : ""} ${active ? "price-on" : ""}`} onClick={onSelect}>
      <div className="price-tag">{tag}</div>
      <div className="price-name">{name}</div>
      <ul className="plist">
        {points.map((p) => <li key={p}><Check /> {p}</li>)}
      </ul>
      <button
        className={`btn ${accent ? "btn-accent" : "btn-primary"}`}
        style={{ width: "100%" }}
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); onStart(); }}
      >
        {busy ? "Starting…" : <>{cta} <Arrow color="#fff" /></>}
      </button>
      {disabled && !busy && (
        <div className="sec-note" style={{ marginTop: 8 }}>Complete organisation, work email and role to begin</div>
      )}
    </div>
  );
}
