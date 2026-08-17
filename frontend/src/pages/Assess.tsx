import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DOMAINS, QUESTIONS, MATURITY_LEVELS, FRAMEWORKS, TOTAL_QUESTIONS } from "../lib/data";
import { useStore } from "../store/useStore";
import { completion } from "../lib/scoring";
import { saveDomain } from "../lib/api";
import { Dot, Arrow } from "../components/icons";

export default function Assess() {
  const { answers, setAnswer, org, assessmentId, assessment, aiSystemName, dirtyDomains, markDomainSynced } = useStore();
  const [idx, setIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmedDomains, setConfirmedDomains] = useState<string[]>([]);
  const [syncedConfirmations, setSyncedConfirmations] = useState<string[]>([]);
  const nav = useNavigate();
  const q = QUESTIONS[idx];
  const answer = answers[q.id] || {};
  const domain = DOMAINS.find((item) => item.id === q.domain)!;
  const domainQuestions = QUESTIONS.filter((item) => item.domain === q.domain);
  const comp = completion(answers);
  const isLast = idx === QUESTIONS.length - 1;
  const isRemediation = Boolean(assessment?.remediationSourceAssessmentId);
  const domainIsConfirmed = confirmedDomains.includes(q.domain);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [idx]);
  useEffect(() => { if (assessment?.status === "finalized") nav("/results", { replace: true }); }, [assessment?.status, nav]);
  useEffect(() => {
    const saved = assessment?.domainConfirmations.map((item) => item.domainId) || [];
    setConfirmedDomains(saved);
    setSyncedConfirmations(saved);
  }, [assessment?.id, assessment?.domainConfirmations]);

  function chooseScore(score: number) {
    setAnswer(q.id, { score });
    if (isRemediation) {
      setConfirmedDomains((current) => current.filter((id) => id !== q.domain));
      setSyncedConfirmations((current) => current.filter((id) => id !== q.domain));
    }
    setSaveError(null);
  }

  function toggleDomainConfirmation(confirmed: boolean) {
    setConfirmedDomains((current) => confirmed
      ? Array.from(new Set([...current, q.domain]))
      : current.filter((id) => id !== q.domain));
    setSaveError(null);
  }

  async function goTo(target: number | "results") {
    if (!assessmentId || saving) return;
    const targetDomain = target === "results" ? null : QUESTIONS[target].domain;
    if (targetDomain !== q.domain) {
      if (!domainQuestions.every((item) => answers[item.id]?.score != null)) {
        setSaveError(`Answer every question in ${domain.name} before continuing.`); return;
      }
      if (isRemediation && !domainIsConfirmed) {
        setSaveError(`Confirm that you reviewed every answer in ${domain.name} before continuing.`); return;
      }
      const needsSave = dirtyDomains.includes(q.domain)
        || (isRemediation && !syncedConfirmations.includes(q.domain));
      if (!needsSave) {
        if (target === "results") nav("/results"); else setIdx(target);
        return;
      }
      setSaving(true); setSaveError(null);
      try {
        await saveDomain(
          assessmentId,
          q.domain,
          Object.fromEntries(domainQuestions.map((item) => [item.id, answers[item.id]])),
          { remediation: isRemediation, confirmed: isRemediation && domainIsConfirmed },
        );
        markDomainSynced(q.domain);
        if (isRemediation) {
          setSyncedConfirmations((current) => Array.from(new Set([...current, q.domain])));
        }
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Could not save this domain");
        setSaving(false); return;
      }
      setSaving(false);
    }
    if (target === "results") nav("/results"); else setIdx(target);
  }

  return <main className="wrap wrap-wide">
    <div className="dash-top" style={{ marginBottom: 16 }}><div><div className="eyebrow">{isRemediation ? "Remediation assessment" : "Readiness assessment"} · {org}</div><div className="assess-org">AI systems in scope: {aiSystemName}</div></div><div className="tier-static">Adoption stage {assessment?.adoptionStage}</div></div>
    <div className="assess">
      <aside className="assess-side"><div className="side-dom">{domain.name}</div><div className="side-pos">{comp.answered}/{comp.total} answered</div><nav className="dnav">{DOMAINS.map((item) => {
        const questions = QUESTIONS.filter((question) => question.domain === item.id);
        return <div key={item.id} className={`dnav-grp ${item.id === q.domain ? "dnav-grp-on" : ""}`}><div className="dnav-name">{item.name}</div><div className="dnav-dots">{questions.map((question) => <button key={question.id} className={`dot-btn ${answers[question.id]?.score != null ? "dot-ans" : ""} ${question.id === q.id ? "dot-cur" : ""}`} title={`Q${question.id} · ${question.title}`} onClick={() => goTo(QUESTIONS.findIndex((candidate) => candidate.id === question.id))} />)}</div></div>;
      })}</nav></aside>
      <section><div className="q-head"><span className="q-num">Q{q.id}<span className="q-of"> / {TOTAL_QUESTIONS}</span></span><span className="q-frameworks">{q.frameworks.map((framework) => FRAMEWORKS[framework]).join(" · ")}</span></div>
        <h2 className="q-title">{q.title}</h2><p className="q-text">{q.text}</p>
        <div className="scale">{MATURITY_LEVELS.map((level) => { const selected = answer.score === level.score; return <button key={level.score} className={`opt ${selected ? "opt-on" : ""}`} onClick={() => chooseScore(level.score)}><span className="opt-score">{level.score}</span><span className="opt-body"><span className="opt-label">{level.label}</span><span className="opt-desc">{level.desc}</span></span><span className="opt-radio">{selected ? <Dot /> : null}</span></button>; })}</div>
        {isRemediation && answer.detail?.trim() && <div className="remediation-reference"><span className="ev-title">Carried evidence reference</span><p>{answer.detail}</p><span>This reference is read-only here. It can be updated in the evidence dossier after this assessment passes.</span></div>}
        {isRemediation && <label className="domain-confirmation"><input type="checkbox" checked={domainIsConfirmed} disabled={!domainQuestions.every((item) => answers[item.id]?.score != null)} onChange={(event) => toggleDomainConfirmation(event.target.checked)} /><span><strong>Confirm {domain.name}</strong><small>I reviewed every carried answer in this domain and confirm the updated scores are accurate.</small></span></label>}
        {saveError && <div className="banner banner-cap" style={{ marginTop: 14 }}>{saveError}</div>}
        <div className="nav"><button className="btn btn-ghost" disabled={idx === 0 || saving} onClick={() => goTo(idx - 1)}>← Previous</button><div className="nav-right">{!isLast ? <button disabled={saving} className={`btn ${answer.score != null ? "btn-primary" : "btn-ghost"}`} onClick={() => goTo(idx + 1)}>{saving ? "Saving domain…" : answer.score != null ? "Next" : "Skip"} <Arrow color={answer.score != null ? "#fff" : "currentColor"} /></button> : <button className="btn btn-accent" disabled={saving || comp.pct < 100} onClick={() => goTo("results")}>{saving ? "Saving domain…" : "Review and finalize"} <Arrow color="#fff" /></button>}</div></div>
        <div className="sec-note">{isRemediation ? "Each complete domain is saved after you review and confirm it." : "Progress is saved to your account after each complete domain"} ({comp.answered}/{comp.total}).</div>
      </section>
    </div>
  </main>;
}
