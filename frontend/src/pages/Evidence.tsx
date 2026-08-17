import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  downloadEvidenceAttachment,
  getEvidenceDossier,
  getResult,
  publicVerificationUrl,
  removeEvidenceAttachment,
  saveEvidenceReference,
  uploadEvidenceAttachment,
  type EvidenceDossierResponse,
} from "../lib/api";
import { completeEvidenceDossier } from "../lib/evidenceWorkflow";
import { useStore } from "../store/useStore";

const ACCEPTED_FILES = ".pdf,.docx,.png,.jpg,.jpeg";

function displayPrice(data: EvidenceDossierResponse) {
  const price = data.selectedProduct?.price;
  if (!price) return "Price unavailable";
  const amount = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: price.currency,
    maximumFractionDigits: 0,
  }).format(price.amountMinor / 100);
  return price.billingPeriod === "year" ? `${amount} per year` : amount;
}

function displayBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

export default function Evidence() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { setAssessment, setServer } = useStore();
  const [data, setData] = useState<EvidenceDossierResponse | null>(null);
  const [references, setReferences] = useState<Record<number, string>>({});
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getEvidenceDossier(id)
      .then((response) => {
        if (!active) return;
        setData(response);
        setName(response.dossier.signatoryName ?? "");
        setAccepted(response.dossier.acceptedDeclaration);
        setReferences(Object.fromEntries(response.items.map((item) => [item.questionId, item.writtenReference])));
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load the evidence dossier");
      });
    return () => { active = false; };
  }, [id]);

  const completed = useMemo(
    () => data?.items.filter((item) => String(references[item.questionId] ?? "").trim()).length ?? 0,
    [data, references],
  );

  async function save(questionId: number) {
    if (!data || data.dossier.status === "issued") return;
    setActiveItem(questionId);
    setError("");
    try {
      await saveEvidenceReference(id, questionId, references[questionId] ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this evidence reference");
    } finally {
      setActiveItem((current) => current === questionId ? null : current);
    }
  }

  async function upload(questionId: number, file?: File) {
    if (!file) return;
    setActiveItem(questionId);
    setError("");
    try {
      setData(await uploadEvidenceAttachment(id, questionId, file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload this attachment");
    } finally {
      setActiveItem(null);
    }
  }

  async function remove(questionId: number) {
    setActiveItem(questionId);
    setError("");
    try {
      setData(await removeEvidenceAttachment(id, questionId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove this attachment");
    } finally {
      setActiveItem(null);
    }
  }

  async function openIssuedResult(assessmentId: string) {
    const result = await getResult(assessmentId);
    setAssessment(result.assessment, false);
    setServer(result);
    navigate("/results");
  }

  async function issue() {
    if (!data || busy || completed !== data.items.length || !name.trim() || !accepted) return;
    setBusy(true);
    setError("");
    let issued: EvidenceDossierResponse;
    try {
      issued = await completeEvidenceDossier({
        dossierId: id,
        items: data.items.map((item) => ({
          questionId: item.questionId,
          writtenReference: references[item.questionId] ?? "",
        })),
        signatoryName: name,
        acceptedDeclaration: accepted,
      });
      setData(issued);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Certificate issuance failed");
      setBusy(false);
      return;
    }
    try {
      await openIssuedResult(issued.dossier.assessmentId);
    } catch (caught) {
      setError(`The certificate was issued, but its result page could not be opened. ${caught instanceof Error ? caught.message : ""}`.trim());
      setBusy(false);
    }
  }

  if (!data) return <main className="wrap"><div className="card">{error || "Loading evidence dossier…"}</div></main>;

  const issued = data.dossier.status === "issued";
  return <main className="wrap wrap-wide">
    <div className="dash-top">
      <div>
        <div className="eyebrow">Evidence dossier · {data.selectedProduct?.name ?? data.dossier.selectedProductId}</div>
        <h1 className="h1">Evidence for nine critical controls</h1>
        <p className="lead">Written references are mandatory. Files are optional and stored privately. Automated evidence review is in development.</p>
      </div>
      <div className="price-cost"><b>{displayPrice(data)}</b></div>
    </div>

    {error && <div className="banner banner-cap" role="alert">{error}</div>}

    {issued && <div className="card" style={{ marginBottom: 20 }}>
      <h2 className="h2">Certificate issued</h2>
      <p className="sec-note">This signed dossier is locked. Its assessment answers and evidence references can no longer be changed.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-primary" disabled={busy} onClick={() => {
          setBusy(true);
          setError("");
          openIssuedResult(data.dossier.assessmentId).catch((caught) => {
            setError(caught instanceof Error ? caught.message : "Could not open the issued result");
            setBusy(false);
          });
        }}>{busy ? "Opening certificate…" : "Open issued certificate"}</button>
        {data.badge && <a className="btn btn-ghost" href={publicVerificationUrl(data.badge.verificationToken)} target="_blank" rel="noreferrer">Public verification</a>}
      </div>
    </div>}

    <div className="case-meta">{completed} of {data.items.length} required references complete</div>
    <div className="evidence-progress" aria-label={`${completed} of ${data.items.length} references complete`}><span style={{ width: `${Math.round((completed / data.items.length) * 100)}%` }} /></div>
    <section className="red-flag-list">
      {data.items.map((item) => <article className="card evidence-item" key={item.id}>
        <div className="card-h">
          <div><span className="card-t">Q{item.questionId} · {item.questionTitle}</span><div className="card-sub">{item.domainName}</div></div>
          <span className="gap-score">{references[item.questionId]?.trim() ? "✓" : "!"}</span>
        </div>
        <p className="sec-note">{item.questionText}</p>
        <div className="field">
          <label className="lbl" htmlFor={`evidence-${item.questionId}`}>Written evidence reference</label>
          <textarea
            id={`evidence-${item.questionId}`}
            className="input"
            value={references[item.questionId] ?? ""}
            disabled={issued || busy}
            onChange={(event) => setReferences((current) => ({ ...current, [item.questionId]: event.target.value }))}
            onBlur={() => save(item.questionId)}
            placeholder="Document or record name, version/date, relevant sections, owner, and secure location"
          />
          {activeItem === item.questionId && <span className="case-meta">Saving…</span>}
        </div>
        <div className="evidence-attachment">
          {item.attachment ? <div className="banner banner-info">
            <div><strong>{item.attachment.originalName}</strong><br /><span className="case-meta">{displayBytes(item.attachment.sizeBytes)} · {item.attachment.mimeType}</span></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-ghost" type="button" onClick={() => downloadEvidenceAttachment(id, item.questionId, item.attachment!.originalName).catch((caught) => setError(caught instanceof Error ? caught.message : "Download failed"))}>Download</button>
              {!issued && <label className="btn btn-ghost file-action">Replace file<input type="file" accept={ACCEPTED_FILES} disabled={activeItem === item.questionId} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; upload(item.questionId, file); }} /></label>}
              {!issued && <button className="btn btn-ghost" type="button" disabled={activeItem === item.questionId} onClick={() => remove(item.questionId)}>Remove</button>}
            </div>
          </div> : !issued && <label className="btn btn-ghost" style={{ display: "inline-block" }}>
            Add optional file
            <input type="file" accept={ACCEPTED_FILES} hidden disabled={activeItem === item.questionId} onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              upload(item.questionId, file);
            }} />
          </label>}
          {!issued && <span className="case-meta" style={{ marginLeft: 10 }}>PDF, DOCX, PNG or JPEG · maximum 10 MB</span>}
        </div>
      </article>)}
    </section>

    {!issued && <div className="card" style={{ marginTop: 20 }}>
      <h2 className="h2">Self-certification declaration</h2>
      <div className="field"><label className="lbl" htmlFor="evidence-signatory">Full name of signatory</label><input id="evidence-signatory" className="input" value={name} disabled={busy} onChange={(event) => setName(event.target.value)} /></div>
      <label className="ev-attest"><input type="checkbox" checked={accepted} disabled={busy} onChange={(event) => setAccepted(event.target.checked)} /><span>I confirm that the assessment and recorded evidence references are accurate to the best of my knowledge.</span></label>
      <button className="btn btn-primary" disabled={busy || !name.trim() || !accepted || completed !== data.items.length} onClick={issue}>{busy ? "Saving evidence and issuing…" : "Sign and issue certificate"}</button>
      {completed !== data.items.length && <p className="case-meta">Complete all nine written references before issuance.</p>}
    </div>}
  </main>;
}
