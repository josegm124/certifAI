import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore, hasEvidence } from "../store/useStore";
import {
  domainScores, gapAnalysis, frameworkCoverage, resolveLevel, completion, levelById,
} from "../lib/scoring";
import { C, barColor } from "../theme";
import { certify } from "../lib/api";
import ScoreDial from "../components/ScoreDial";
import LevelBadge, { LEVEL_COLOR } from "../components/Badges";
import { Sparkle, ShieldAlert, Check } from "../components/icons";

export default function Results() {
  const { org, email, tier, answers, signed, setSigned, userId, assessmentId, setIdentity, server, setServer } = useStore();
  const [signName, setSignName] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const comp = completion(answers);
  // Below 100% there is no level of record — the server no longer stores one,
  // and this page must not present one either. Counts come from completion(),
  // which reads QUESTIONS, so they track the instrument rather than a typed number.
  const incomplete = comp.pct < 100;
  const evidence = hasEvidence(answers);
  // LOCAL PREVIEW ONLY. The badge of record comes from the server (`server`).
  const result = useMemo(() => resolveLevel(answers, { tier, hasEvidence: evidence, hasSignature: signed }), [answers, tier, evidence, signed]);

  /* Sign -> certify. The server re-derives the gates from stored answers and
     decides the level; we only ever render what it returns. */
  async function signAndCertify() {
    setIssuing(true);
    setApiError(null);
    try {
      const r = await certify(
        org, email, answers,
        { tier, hasEvidence: evidence, hasSignature: true },
        userId && assessmentId ? { userId, assessmentId } : undefined
      );
      setServer(r);
      setSigned(true);
      if (r.badge) setIdentity(userId ?? "", assessmentId ?? "");
    } catch (err) {
      // Backend down: keep the local preview, issue NO badge, say so.
      setApiError(err instanceof Error ? err.message : String(err));
      setServer(null);
      setSigned(true);
    } finally {
      setIssuing(false);
    }
  }
  // What the page displays: the server's verdict once it exists, the local
  // preview until then. The two agree in the normal case; if they ever differ,
  // the server wins, because it is the one that issued (or refused) the badge.
  const shownLevel = levelById(server?.level ?? result.level.id);
  const shownScore = server?.overallScore ?? result.overall;
  const shownCapReason = server ? server.cappedReason : result.cappedReason;
  const shownCapFrom = server ? server.cappedFrom : result.cappedFrom;
  const shownFailedIds = server ? server.criticalGating.failedIds : result.gate.failedIds;

  const ds = useMemo(() => domainScores(answers), [answers]);
  const gaps = useMemo(() => gapAnalysis(answers), [answers]);
  const fw = useMemo(() => frameworkCoverage(answers), [answers]);

  if (comp.answered === 0) {
    return (
      <main className="wrap"><div className="card" style={{ textAlign: "center", padding: 48 }}>
        <h2 className="h2">No results yet.</h2>
        <p className="lead" style={{ margin: "0 auto 22px" }}>Take the assessment to generate your readiness report.</p>
        <Link to="/start" className="btn btn-primary btn-lg">Start assessment</Link>
      </div></main>
    );
  }

  const narrative = buildNarrative(org, result.overall, result.level.name, ds, gaps.length);

  return (
    <main className="wrap wrap-wide">
      <div className="dash-top">
        <div>
          <div className="eyebrow">Readiness report{org ? ` · ${org}` : ""}</div>
          <h1 className="h1" style={{ fontSize: 32, marginBottom: 4 }}>AI Governance Readiness</h1>
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <Link to="/assess" className="btn btn-ghost">Edit answers</Link>
          <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
          <button className="btn btn-ghost" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>

      <motion.div className="res-hero" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <ScoreDial pct={shownScore} color={incomplete ? C.mute : LEVEL_COLOR[shownLevel.id]} />
        {incomplete ? (
          <div className="lvlpanel" style={{ border: 0, padding: 0 }}>
            <div className="lvlpanel-body">
              <div className="lvlpanel-name">No level yet</div>
              <div className="lvlpanel-state">{comp.answered} of {comp.total} questions answered · {comp.pct}%</div>
              <div className="lvlpanel-blurb">
                A level is recorded once every question has been answered. The score above is a running
                preview of what you have answered so far.{" "}
                <Link to="/assess" className="finish-link">Continue the assessment →</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="lvlpanel" style={{ border: 0, padding: 0 }}>
            <LevelBadge level={shownLevel.id} size={62} />
            <div className="lvlpanel-body">
              <div className="lvlpanel-name">{shownLevel.name}<span className="rung-code" style={{ background: LEVEL_COLOR[shownLevel.id] }}>{shownLevel.id}</span></div>
              <div className="lvlpanel-state">
                {server?.badge
                  ? "Issued by CertifAI · verifiable badge"
                  : server
                    ? "Score of record · no badge issued"
                    : "Local preview · not yet submitted"}
              </div>
              <div className="lvlpanel-blurb">{shownLevel.blurb}</div>
            </div>
          </div>
        )}
      </motion.div>

      {/* A cap explains why a level was held down. With no level on show there is
          nothing to explain, so this stays hidden until the run is complete. */}
      {!incomplete && shownCapFrom && (
        <div className="banner banner-cap">
          <ShieldAlert />
          <div><strong>Level held at {shownLevel.name}.</strong> {shownCapReason}
            {shownFailedIds.length > 0 && ` Failed critical controls: ${shownFailedIds.map((id) => `Q${id}`).join(", ")}.`}
            {server && <em style={{ display: "block", marginTop: 4, opacity: 0.85 }}>Determined server-side from your stored answers.</em>}</div>
        </div>
      )}

      {/* The issued credential — this block only ever renders server data. */}
      {server?.badge && (
        <div className="banner banner-info" style={{ marginTop: 14 }}>
          <Check color={C.ocean} />
          <div>
            <strong>Badge issued · {server.badge.tier}</strong> · score of record {server.badge.score}/100.
            <div style={{ marginTop: 6, fontSize: 13.5 }}>
              Token <code>{server.badge.verificationToken}</code><br />
              Issued {new Date(server.badge.issuedAt).toLocaleDateString()} · expires {new Date(server.badge.expiresAt).toLocaleDateString()}<br />
              Verify at <a href={server.badge.verifyUrl} target="_blank" rel="noreferrer">{server.badge.verifyUrl}</a>
            </div>
          </div>
        </div>
      )}

      {apiError && (
        <div className="banner banner-cap" style={{ marginTop: 14 }}>
          <ShieldAlert />
          <div><strong>No badge issued.</strong> The certification service is unreachable, so the score above is your local preview only.
            A signature on this device cannot create a credential on its own, because the badge is issued only after the server re-checks your stored evidence and critical controls. Try again once the service is running.
            <em style={{ display: "block", marginTop: 4, opacity: 0.8 }}>{apiError}</em></div>
        </div>
      )}

      {/* AI narrative. Hidden below 100%: it names a level, which contradicts
          the "no level is recorded" panel above. The text itself is unchanged. */}
      {!incomplete && (
        <div className="ai-box" style={{ marginTop: 18 }}>
          <div className="ai-tag"><Sparkle size={14} /> Readiness summary</div>
          <div className="prose" style={{ fontSize: 14.5 }}><p style={{ margin: 0 }}>{narrative}</p></div>
        </div>
      )}

      <h3 className="sec-h">Maturity by domain</h3>
      <div className="dbars">
        {ds.map((d) => (
          <div key={d.id}>
            <div className="dbar-top">
              <span className="dbar-name">{d.name}</span>
              <span className="dbar-pct" style={{ color: C.ink }}>{d.answeredCount ? `${d.pct}%` : "—"}</span>
            </div>
            <div className="dbar-track"><div className="dbar-fill" style={{ width: `${d.pct}%`, background: barColor(d.pct) }} /></div>
          </div>
        ))}
      </div>

      <div className="dd-sub" style={{ marginTop: 18 }}>
        <div>
          <h3 className="sec-h">Priority remediation</h3>
          <ul className="gaps">
            {gaps.slice(0, 8).map((g) => (
              <li key={g.id} className="gap">
                <span className={`gap-score gap-score-${g.score <= 1 ? "lo" : g.score <= 3 ? "mid" : "hi"}`}>{g.score}</span>
                <div><div className="gap-title">{g.title}{g.critical && <span className="gap-crit">critical</span>}</div>
                  <div className="gap-meta">{g.domainName} · raise {g.gapSize} {g.gapSize === 1 ? "level" : "levels"}</div></div>
              </li>
            ))}
            {gaps.length === 0 && <div style={{ fontSize: 13.5, color: C.pine, padding: "10px 0" }}>No gaps. Every answered question sits at Managed or above.</div>}
          </ul>
        </div>
        <div>
          <h3 className="sec-h">Framework coverage</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {fw.map((f) => (
              <div key={f.k} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `conic-gradient(${barColor(f.pct)} ${f.pct * 3.6}deg, ${C.line} 0deg)` }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.panel, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{f.pct}%</div>
                </div>
                <span style={{ fontSize: 13, color: C.inkSoft, fontWeight: 500 }}>{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tier 2 self-certification. Below 100% the card stays visible so the
          step is still shown, but muted and inert: signing is a claim about a
          finished assessment. What signing does is unchanged, only when. */}
      {tier === 2 && (
        <div className="card" style={{ marginTop: 24, opacity: incomplete ? 0.6 : 1 }}>
          <div className="card-h"><span className="card-t">Self-certification</span><span className="card-sub">required for Assured and above, available once every question is answered</span></div>
          {signed ? (
            <div className="banner banner-info" style={{ margin: "10px 0 0" }}>
              <Check color={C.ocean} />
              <div>Signed by <b>{signName || "authorised signatory"}</b>. This attests that {org || "the organisation"} holds the documented evidence recorded against each control at the stated maturity, as an evidence-backed self-assessment at the {shownLevel.name} level.
                {!server && <em style={{ display: "block", marginTop: 4, opacity: 0.8 }}>Not submitted for certification, so no badge has been issued.</em>}</div>
            </div>
          ) : (
            <>
              <p className="sec-note" style={{ margin: "4px 0 12px" }}>By signing, you attest that the scores and evidence recorded are accurate to the best of your knowledge. Your answers and evidence are then submitted to CertifAI, which re-checks the critical controls and issues the badge. The signature alone does not create a credential.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input className="input" style={{ maxWidth: 280 }} placeholder="Full name of signatory" value={signName} onChange={(e) => setSignName(e.target.value)} disabled={incomplete} />
                <button className="btn btn-accent" disabled={incomplete || !signName.trim() || issuing} onClick={signAndCertify}>
                  {issuing ? "Submitting for certification…" : "Sign & submit for certification"}
                </button>
              </div>
              {incomplete && <p className="sec-note" style={{ margin: "10px 0 0" }}>Unlocks when every question is answered.</p>}
            </>
          )}
        </div>
      )}

      {tier === 1 && (
        <div className="card" style={{ marginTop: 24, background: C.ink, borderColor: C.ink }}>
          <div className="cert-tag" style={{ color: "#7FB8C9" }}>Tier 2 · Evidence-Based Certification</div>
          <h3 style={{ fontFamily: "'Lora',serif", color: "#fff", fontSize: 21, margin: "6px 0" }}>Turn this snapshot into a credential.</h3>
          <p style={{ color: "#B9C7D0", fontSize: 14, margin: "0 0 16px", maxWidth: "54ch", lineHeight: 1.5 }}>Attach evidence against each control, sign your self-certification, and earn a displayable Aligned, Assured or Advanced badge. Automated evidence review is in development.</p>
          <Link to="/upgrade" className="btn btn-accent" style={{ width: "auto" }}>Add evidence →</Link>
        </div>
      )}

      <p className="disclaimer">A self-assessed, evidence-backed readiness signal. Not a certification, legal advice, or a conformity assessment under the EU AI Act.</p>
    </main>
  );
}

function buildNarrative(org: string, overall: number, level: string, ds: ReturnType<typeof domainScores>, gapCount: number): string {
  const answered = ds.filter((d) => d.answeredCount > 0);
  const strongest = [...answered].sort((a, b) => b.pct - a.pct)[0];
  const weakest = [...answered].sort((a, b) => a.pct - b.pct)[0];
  const who = org || "The organisation";
  return `${who} reaches an overall readiness of ${overall}/100, placing it at the ${level} level. Its strongest area is ${strongest?.name ?? "—"} (${strongest?.pct ?? 0}%), while ${weakest?.name ?? "—"} (${weakest?.pct ?? 0}%) is the clearest opportunity to raise the posture. With ${gapCount} open control gap${gapCount === 1 ? "" : "s"} identified, the recommended path is to close the highest-weighted and any critical gaps first, evidencing each control so the practice is demonstrably applied, measured, and reviewed. This is a self-assessed, AI-assisted readiness signal and does not constitute a conformity assessment under the EU AI Act.`;
}
