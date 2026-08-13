import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCertificateCatalog,
  type CertificateCatalog,
  type CertificateCatalogProduct,
} from "../lib/api";
import type { LevelId } from "../lib/scoring";
import LevelBadge from "./Badges";

function displayPrice(product: CertificateCatalogProduct) {
  if (!product.price) return "Price unavailable";
  const amount = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: product.price.currency,
    maximumFractionDigits: 0,
  }).format(product.price.amountMinor / 100);
  return product.price.billingPeriod === "year" ? `${amount} per year` : amount;
}

export default function CertificateOptions({ assessmentId, levelId }: { assessmentId: string; levelId: LevelId }) {
  const [catalog, setCatalog] = useState<CertificateCatalog | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getCertificateCatalog()
      .then((response) => { if (active) setCatalog(response); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  const eligibility = useMemo(() => {
    if (!catalog) return null;
    const earned = catalog.levels.find((level) => level.code === levelId) || null;
    const products = earned
      ? catalog.products.filter((product) => (
        product.productType === "certificate" &&
        product.level != null &&
        product.level.rank <= earned.rank
      ))
      : [];
    return { earned, products };
  }, [catalog, levelId]);

  if (error) return <div className="banner banner-cap">Certificate options could not be loaded from the backend catalog.</div>;
  if (!eligibility) return <div className="card certificate-options-loading">Loading certificate options…</div>;

  if (!eligibility.earned?.badgeEligible || !eligibility.products.length) {
    return <section className="card certificate-options-empty">
      <LevelBadge level="A1" size={48} />
      <div><h3 className="sec-h">Aware readiness result</h3><p className="sec-note">No certificate can be purchased for an Aware result. Use the dashboard to review the gaps, improve the controls and take a new assessment later.</p></div>
    </section>;
  }

  return <section className="certificate-options">
    <div className="eyebrow">Certificate eligibility · preview only</div>
    <h3 className="h2">Your result supports up to {eligibility.earned.name}.</h3>
    <p className="sec-note">The free assessment has not issued a badge or certificate. You may choose the highest supported level or a lower available level.</p>
    <div className="certificate-offers">
      {eligibility.products.map((product) => (
        <article className="price price-accent certificate-offer" key={product.id}>
          <LevelBadge level={product.level!.code as LevelId} size={52} />
          <div className="price-tag">{product.level!.code} · badge preview</div>
          <div className="price-name">{product.name}</div>
          <div className="price-cost"><b>{displayPrice(product)}</b></div>
          <p className="sec-note">{product.description}</p>
          <Link className="btn btn-accent" to={`/upgrade?assessment=${encodeURIComponent(assessmentId)}&product=${encodeURIComponent(product.id)}`}>View {product.level!.name}</Link>
        </article>
      ))}
    </div>
  </section>;
}
