import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getAssessmentDashboard,
  getCertificateCatalog,
  type AssessmentDashboardResponse,
  type CertificateCatalog,
  type CertificateCatalogProduct,
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
  const [catalog, setCatalog] = useState<CertificateCatalog | null>(null);
  const [dashboard, setDashboard] = useState<AssessmentDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId || !productId) return;
    let active = true;
    Promise.all([getCertificateCatalog(), getAssessmentDashboard(assessmentId)])
      .then(([catalogResponse, dashboardResponse]) => {
        if (!active) return;
        setCatalog(catalogResponse);
        setDashboard(dashboardResponse);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load this certificate option");
      });
    return () => { active = false; };
  }, [assessmentId, productId]);

  const selection = useMemo(() => {
    if (!catalog || !dashboard || !productId) return null;
    const earned = catalog.levels.find((level) => level.code === dashboard.result.level.id) || null;
    const product = catalog.products.find((item) => item.id === productId) || null;
    const eligible = Boolean(
      dashboard.assessment.tier === 1 &&
      dashboard.assessment.status === "finalized" &&
      earned?.badgeEligible &&
      product?.productType === "certificate" &&
      product.level &&
      product.level.rank <= earned.rank
    );
    return { earned, product, eligible };
  }, [catalog, dashboard, productId]);

  if (!assessmentId || !productId) return <main className="wrap"><div className="card" style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", padding: 44 }}>
    <div className="eyebrow">Certificate options</div><h1 className="h2">Choose a certificate from a completed free assessment.</h1>
    <p className="lead" style={{ margin: "0 auto 20px" }}>Open a finalized Tier 1 result in the dashboard to see the certificate levels supported by its score.</p>
    <Link className="btn btn-primary" to="/dashboard">Open dashboard</Link>
  </div></main>;

  if (error) return <main className="wrap"><div className="banner banner-cap">{error}</div><Link className="btn btn-ghost" to="/dashboard">Return to dashboard</Link></main>;
  if (!selection) return <main className="wrap"><div className="card" style={{ textAlign: "center", padding: 44 }}>Loading the certificate option from the backend…</div></main>;

  if (!selection.eligible || !selection.product?.level || !selection.earned) return <main className="wrap"><div className="card" style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", padding: 44 }}>
    <div className="eyebrow">Option unavailable</div><h1 className="h2">This assessment does not support the selected certificate.</h1>
    <p className="lead" style={{ margin: "0 auto 20px" }}>A certificate cannot be purchased above the level supported by the finalized readiness result.</p>
    <Link className="btn btn-primary" to="/dashboard">Return to dashboard</Link>
  </div></main>;

  const product = selection.product;
  const productLevel = product.level!;
  return <main className="wrap"><div className="card upgrade-product" style={{ maxWidth: 760, margin: "0 auto", padding: 44 }}>
    <div className="upgrade-product-head">
      <LevelBadge level={productLevel.code as LevelId} size={72} />
      <div><div className="eyebrow">{productLevel.code} · eligible certificate</div><h1 className="h2">{product.name}</h1><div className="price-cost"><b>{displayPrice(product)}</b></div></div>
    </div>
    <p className="lead">Your free assessment scored {dashboard!.result.overallScore}/100 and supports certificates up to {selection.earned.name}. Choosing {productLevel.name} does not change the assessment score.</p>
    <ul className="plist">{product.features.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul>
    <div className="banner banner-info">No payment or order is created in this demo. This page confirms the product and eligibility before the future payment and certificate workflow.</div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link className="btn btn-primary" to="/dashboard">Return to dashboard</Link><Link className="btn btn-ghost" to="/start">Open Tier 2 demo</Link></div>
  </div></main>;
}
