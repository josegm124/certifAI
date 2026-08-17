import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  createEvidenceDossier,
  getCertificateOptions,
  type CertificateCatalogProduct,
  type CertificateOptionsResponse,
} from "../lib/api";
import LevelBadge from "../components/Badges";
import type { LevelId } from "../lib/scoring";
import { Check } from "../components/icons";

function displayPrice(product: CertificateCatalogProduct) {
  if (!product.price) return "Price unavailable";
  const amount = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: product.price.currency,
    maximumFractionDigits: 0,
  }).format(product.price.amountMinor / 100);
  return product.price.billingPeriod === "year" ? `${amount} per certificate, per year` : amount;
}

export default function Upgrade() {
  const [search] = useSearchParams();
  const assessmentId = search.get("assessment");
  const productId = search.get("product");
  const navigate = useNavigate();
  const [options, setOptions] = useState<CertificateOptionsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!assessmentId) return;
    let active = true;
    getCertificateOptions(assessmentId)
      .then((response) => { if (active) setOptions(response); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load certificate options"); });
    return () => { active = false; };
  }, [assessmentId]);

  const product = useMemo(
    () => options?.eligibleProducts.find((candidate) => candidate.id === productId) || null,
    [options, productId],
  );

  async function continueToDossier() {
    if (!assessmentId || !product || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await createEvidenceDossier(assessmentId, product.id);
      navigate(`/evidence/${response.dossier.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open the evidence dossier");
      setBusy(false);
    }
  }

  if (!assessmentId || !productId) return <main className="wrap"><div className="card" style={{ textAlign: "center", padding: 44 }}><div className="eyebrow">Certificate options</div><h1 className="h2">Choose a certificate from an eligible finalised result.</h1><Link className="btn btn-primary" to="/dashboard">Open dashboard</Link></div></main>;
  if (error && !options) return <main className="wrap"><div className="banner banner-cap">{error}</div><Link className="btn btn-ghost" to="/dashboard">Return to dashboard</Link></main>;
  if (!options) return <main className="wrap"><div className="card">Loading the backend-verified certificate option…</div></main>;
  if (!product?.level) return <main className="wrap"><div className="card" style={{ textAlign: "center", padding: 44 }}><div className="eyebrow">Option unavailable</div><h1 className="h2">This assessment does not support the selected certificate.</h1><p className="lead">The backend may have blocked it because of the score or a failed critical control.</p><Link className="btn btn-primary" to="/dashboard">Return to dashboard</Link></div></main>;

  return <main className="wrap"><div className="card upgrade-product" style={{ maxWidth: 760, margin: "0 auto", padding: 44 }}>
    <div className="upgrade-product-head"><LevelBadge level={product.level.code as LevelId} size={72} /><div><div className="eyebrow">{product.level.code} · eligible certificate</div><h1 className="h2">{product.name}</h1><div className="price-cost"><b>{displayPrice(product)}</b></div></div></div>
    <p className="lead">This selection has been verified against the stored Tier 1 score and the nine persisted red flags. Choosing a lower level never changes the readiness result.</p>
    <ul className="plist">{product.features.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul>
    <div className="banner banner-info">No payment or order is created in this demo. Continue directly to the private evidence dossier. Automated evidence review is in development.</div>
    {error && <div className="banner banner-cap">{error}</div>}
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link className="btn btn-ghost" to="/dashboard">Return to dashboard</Link><button className="btn btn-primary" disabled={busy} onClick={continueToDossier}>{busy ? "Opening dossier…" : "Continue to evidence dossier"}</button></div>
  </div></main>;
}
