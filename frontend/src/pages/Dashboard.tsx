import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore, hasEvidence } from "../store/useStore";
import {
  domainScores, gapAnalysis, frameworkCoverage, resolveLevel, completion, LEVELS, levelById,
} from "../lib/scoring";
import { C, barColor } from "../theme";
import MaturityMatrix from "../components/MaturityMatrix";
import RadarChart, { type RadarPoint } from "../components/RadarChart";
import ScoreDial from "../components/ScoreDial";
import LevelBadge, { LEVEL_COLOR } from "../components/Badges";
import { Arrow, ShieldAlert } from "../components/icons";
import { CERTIFICATIONS, CERT_ORDER } from "../lib/certifications";
// DOMAIN_SHORT is owned by data.ts. A private copy lived here and another in
// Landing.tsx; both went stale when the ninth domain landed.
import { DOMAIN_SHORT } from "../lib/data";

const fwShort: Record<string, string> = {
  aiact: "EU AI Act", gdpr: "GDPR", oecd: "OECD", g7: "G7", gpai: "GPAI", iso: "ISO 42001", nist: "NIST",
};

export default function Dashboard() {
  const { org, tier, answers, signed, loadSample, server } = useStore();
  const nav = useNavigate();
  const [radarView, setRadarView] = useState<"domains" | "frameworks">("domains");

  const comp = completion(answers);
  const evidence = hasEvidence(answers);
  const result = useMemo(
    () => resolveLevel(answers, { tier, hasEvidence: evidence, hasSignature: signed }),
    [answers, tier, evidence, signed]
  );
  // Same rule as Results: the server's verdict wins once it exists.
  const shownLevel = levelById(server?.level ?? result.level.id);
  const shownScore = server?.overallScore ?? result.overall;

  const ds = useMemo(() => domainScores(answers), [answers]);
  const gaps = useMemo(() => gapAnalysis(answers), [answers]);
  const fw = useMemo(() => frameworkCoverage(answers), [answers]);

  if (comp.answered === 0) {
    return (
      <main className="wrap">
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <h2 className="h2">Your dashboard is waiting.</h2>
          <p className="lead" style={{ margin: "0 auto 22px" }}>Take the free assessment to bring it to life — or load a sample profile to explore.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/start" className="btn btn-primary btn-lg">Start assessment</Link>
            <button className="btn btn-ghost btn-lg" onClick={loadSample}>Load sample profile</button>
          </div>
        </div>
      </main>
    );
  }

  const domainRadar: RadarPoint[] = ds.map((d) => ({ id: d.id, label: d.name, short: DOMAIN_SHORT[d.id], pct: d.pct }));
  const fwRadar: RadarPoint[] = fw.map((f) => ({ id: f.k, label: f.name, short: fwShort[f.k], pct: f.pct }));

  // next-level guidance
  const curIdx = LEVELS.findIndex((l) => l.id === result.level.id);
  const next = LEVELS[curIdx + 1];
  const pointsToNext = next ? Math.max(0, next.min - result.overall) : 0;

  const certifications = [
    { key: "snapshot", tag: "Free · Tier 1", name: "AI Governance Readiness Snapshot", level: result.level.id, pct: comp.pct, live: true },
    { key: "aipowered", tag: "Paid · Tier 2", name: "Evidence-Based Certification", level: result.level.id, pct: result.overall, live: true },
    { key: "aiact", tag: "Coming soon", name: "EU AI Act Conformity Pack", level: "A1" as const, pct: 0, live: false },
    { key: "iso", tag: "Coming soon", name: "ISO/IEC 42001 Certification", level: "A1" as const, pct: 0, live: false },
  ];

  return (
    <main className="wrap wrap-wide">
      <div className="dash-top">
        <div>
          <div className="eyebrow">Dashboard{org ? ` · ${org}` : ""}</div>
          <h1 className="h1" style={{ fontSize: 32, marginBottom: 4 }}>AI Governance Readiness</h1>
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <Link to="/assess" className="btn btn-ghost">Edit answers</Link>
          <Link to="/results" className="btn btn-ghost">Full report</Link>
        </div>
      </div>

      {/* hero: level + dial */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="res-hero">
        <ScoreDial pct={shownScore} color={LEVEL_COLOR[shownLevel.id]} />
        <div className="lvlpanel" style={{ border: 0, padding: 0 }}>
          <LevelBadge level={shownLevel.id} size={62} />
          <div className="lvlpanel-body">
            <div className="lvlpanel-name">
              {shownLevel.name}
              <span className="rung-code" style={{ background: LEVEL_COLOR[shownLevel.id] }}>{shownLevel.id}</span>
            </div>
            {/* Never claim a displayable badge from local state — only the
                server issues one, so only a server response may say so. */}
            <div className="lvlpanel-state">
              {server?.badge
                ? "Issued by CertifAI · verifiable badge"
                : server
                  ? "Score of record · no badge issued"
                  : result.cappedFrom
                    ? "Preview · held below score band, see note"
                    : "Local preview · sign & submit to certify"}
              {" · "}{comp.answered}/{comp.total} controls answered
            </div>
            <div className="lvlpanel-blurb">{shownLevel.blurb}</div>
          </div>
        </div>
      </motion.div>

      {result.cappedFrom && (
        <div className="banner banner-cap">
          <ShieldAlert />
          <div>
            <strong>Level held at {result.level.name}.</strong> {result.cappedReason}
            {result.gate.failedIds.length > 0 && ` Failed critical controls: ${result.gate.failedIds.map((id) => `Q${id}`).join(", ")}.`}
          </div>
        </div>
      )}

      {/* matrix + radar */}
      <div className="dash-grid">
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <div className="card-h">
            <span className="card-t">Maturity valuation matrix</span>
            <span className="card-sub">domain × maturity level</span>
          </div>
          <p className="sec-note" style={{ margin: "2px 0 14px" }}>Hover a row for its drivers · click to open the deep-dive.</p>
          <MaturityMatrix answers={answers} />
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }}>
          <div className="card-h">
            <span className="card-t">Coverage radar</span>
            <div className="seg">
              <button className={radarView === "domains" ? "on" : ""} onClick={() => setRadarView("domains")}>Domains</button>
              <button className={radarView === "frameworks" ? "on" : ""} onClick={() => setRadarView("frameworks")}>Frameworks</button>
            </div>
          </div>
          <RadarChart
            key={radarView}
            data={radarView === "domains" ? domainRadar : fwRadar}
            benchmark={next ? next.min : undefined}
            benchmarkLabel={next ? `${next.name} target` : undefined}
            accent={LEVEL_COLOR[result.level.id] === C.mute ? C.pine : LEVEL_COLOR[result.level.id]}
            linkBase={radarView === "domains" ? "/dimensions" : "/certifications"}
          />
        </motion.div>
      </div>

      {/* certifications */}
      <h3 className="sec-h">Your certifications</h3>
      <div className="certs">
        {certifications.map((c) => (
          <motion.div key={c.key} className={`cert ${c.live ? "" : "cert-locked"}`} whileHover={c.live ? { y: -4 } : undefined} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
            {!c.live && <span className="cert-soon">Coming soon</span>}
            <div>
              <div className="cert-tag">{c.tag}</div>
              <div className="cert-name">{c.name}</div>
            </div>
            <div className="cert-lvl">
              <LevelBadge level={c.level} size={30} />
              <div className="cert-track"><div className="cert-fill" style={{ width: `${c.pct}%`, background: barColor(c.pct) }} /></div>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, minWidth: 34, textAlign: "right" }}>{c.pct}%</span>
            </div>
            {c.live ? (
              <Link to={c.key === "snapshot" ? "/assess" : "/results"} className="btn btn-ghost" style={{ width: "100%" }}>
                {c.key === "snapshot" ? "Continue assessment" : "View certification"} <Arrow />
              </Link>
            ) : (
              <button className="btn btn-ghost" style={{ width: "100%" }} disabled>Not yet available</button>
            )}
          </motion.div>
        ))}
      </div>

      {/* framework catalog */}
      <h3 className="sec-h">Explore the frameworks</h3>
      <p className="sec-note">Your readiness against each framework, computed from the controls it maps to. Click any to dig into what it requires.</p>
      <div className="certs" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" }}>
        {CERT_ORDER.map((k) => {
          const cert = CERTIFICATIONS[k];
          const pct = fw.find((f) => f.k === k)?.pct ?? 0;
          return (
            <motion.button
              key={k}
              className="cert"
              style={{ textAlign: "left", cursor: "pointer", font: "inherit" }}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              onClick={() => nav(`/certifications/${k}`)}
            >
              <div>
                <div className="cert-tag">{cert.type}</div>
                <div className="cert-name">{cert.name}</div>
              </div>
              <div className="cert-lvl">
                <div className="cert-track"><div className="cert-fill" style={{ width: `${pct}%`, background: barColor(pct) }} /></div>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, minWidth: 34, textAlign: "right" }}>{pct}%</span>
              </div>
              <span className="hdr-link" style={{ paddingLeft: 0, color: C.ocean, fontSize: 13 }}>Dig in →</span>
            </motion.button>
          );
        })}
      </div>

      {/* guidance rail */}
      <h3 className="sec-h">What to do next</h3>
      <div className="rail">
        {next && (
          <div className="rail-next">
            <div className="rail-next-t">Next level</div>
            <div className="rail-next-h">{pointsToNext > 0 ? `${pointsToNext} points from ${next.name}` : `Ready for ${next.name}`}</div>
            <div className="rail-next-p">
              {pointsToNext > 0
                ? `Close your highest-priority gaps below to reach ${next.min}. `
                : `You've reached the ${next.name} score band. `}
              {next.needsSignature && !signed ? "A signed self-certification is also required." : next.needsEvidence && !evidence ? "Attach evidence to your controls to qualify." : ""}
            </div>
          </div>
        )}
        <div className="card">
          <div className="card-h"><span className="card-t">Top priority gaps</span><span className="card-sub">weighted by domain & criticality</span></div>
          <ul className="gaps">
            {gaps.slice(0, 6).map((g) => (
              <li key={g.id} className="gap" onClick={() => nav(`/dimensions/${g.domainId}`)}>
                <span className={`gap-score gap-score-${g.score <= 1 ? "lo" : g.score <= 3 ? "mid" : "hi"}`}>{g.score}</span>
                <div>
                  <div className="gap-title">{g.title}{g.critical && <span className="gap-crit">critical</span>}</div>
                  <div className="gap-meta">{g.domainName} · raise {g.gapSize} {g.gapSize === 1 ? "level" : "levels"} to close</div>
                </div>
              </li>
            ))}
            {gaps.length === 0 && <div style={{ fontSize: 13.5, color: C.pine, padding: "10px 0" }}>No gaps. Every answered question sits at Managed or above.</div>}
          </ul>
        </div>
      </div>

      <p className="disclaimer">
        A self-assessed, evidence-backed readiness signal. Not a certification, legal advice, or a conformity assessment under the EU AI Act.
      </p>
    </main>
  );
}
