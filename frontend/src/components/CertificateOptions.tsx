import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCertificateOptions,
  type CertificateCatalogProduct,
  type CertificateEligibility,
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

export default function CertificateOptions({ assessmentId, levelId = "A1" }: { assessmentId: string; levelId?: LevelId }) {
  const [products, setProducts] = useState<CertificateCatalogProduct[] | null>(null);
  const [eligibility, setEligibility] = useState<CertificateEligibility | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCertificateOptions(assessmentId)
      .then((response) => {
        if (!active) return;
        setProducts(response.eligibleProducts);
        setEligibility(response.certificateEligibility);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Certificate options could not be loaded");
      });
    return () => { active = false; };
  }, [assessmentId]);

  if (error) return <div className="banner banner-cap">{error}</div>;
  if (!products || !eligibility) return <div className="card certificate-options-loading">Loading certificate options from the backend…</div>;

  if (!eligibility.allowed || products.length === 0) {
    return <section className="card certificate-options-empty">
      <LevelBadge level={levelId} size={48} />
      <div>
        <h3 className="sec-h">No certificate currently available</h3>
        <p className="sec-note">{eligibility.failedCriticalCount > 0
          ? `${eligibility.failedCriticalCount} critical control${eligibility.failedCriticalCount === 1 ? "" : "s"} failed. Use the remediation guidance and start a new assessment when ready.`
          : eligibility.earnedLevel === "aware"
            ? "An Aware result receives the free readiness report and guidance, but cannot proceed to certification."
            : "The persisted certificate-gate evaluation is incomplete, so no product can be offered."}</p>
      </div>
    </section>;
  }

  return <section className="certificate-options">
    <div className="eyebrow">Certificate eligibility · backend verified</div>
    <h3 className="h2">Choose the supported certificate that fits your organisation.</h3>
    <p className="sec-note">You may select the highest supported level or a lower available level. Paying more never raises the assessed level.</p>
    <div className="certificate-offers">
      {products.map((product) => <article className="price price-accent certificate-offer" key={product.id}>
        <LevelBadge level={product.level!.code as LevelId} size={52} />
        <div className="price-tag">{product.level!.code} · eligible</div>
        <div className="price-name">{product.name}</div>
        <div className="price-cost"><b>{displayPrice(product)}</b></div>
        <p className="sec-note">{product.description}</p>
        <Link className="btn btn-accent" to={`/upgrade?assessment=${encodeURIComponent(assessmentId)}&product=${encodeURIComponent(product.id)}`}>Choose {product.level!.name}</Link>
      </article>)}
    </div>
  </section>;
}
