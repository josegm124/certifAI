import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="ftr-in">
        <div>
          <div className="ftr-brand"><Logo size={20} /> CertifAI</div>
          <p className="ftr-txt" style={{ marginTop: 8 }}>
            A self-assessed, evidence-backed readiness signal for AI governance.
            CertifAI certificates are not conformity assessments under the EU AI Act and are not legal advice.
          </p>
        </div>
        <p className="ftr-txt">EU AI Act · GDPR · OECD · G7 Hiroshima · GPAI · ISO/IEC 42001 · NIST AI RMF</p>
      </div>
    </footer>
  );
}
