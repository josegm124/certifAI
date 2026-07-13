const express = require('express');

/**
 * Public, server-rendered badge verification pages.
 *
 * WHY server-rendered (not React): social scrapers (LinkedIn, Slack, X, WhatsApp)
 * do NOT execute JavaScript. They read the raw HTML response and pull the
 * OpenGraph <meta> tags for the link preview. Those tags therefore MUST be in
 * the initial HTML the server returns — which is exactly what this route does.
 *
 * Routes:
 *   GET /verify/:token            → HTML verification page (+ OpenGraph tags)
 *   GET /verify/:token/badge.svg  → dynamically generated badge image (OG image)
 */
const createVerifyRoutes = ({ badgeService, companyService }) => {
  const router = express.Router();

  const escapeHtml = (str = '') =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Absolute origin of the current request (e.g. https://app.certifai.com).
  // Prefer an explicit public URL in production so previews use the real host
  // even when behind a proxy.
  const originOf = (req) =>
    (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const loadBadge = async (token) => {
    const badge = await badgeService.verifyBadge(token);
    if (!badge) return null;
    let orgName = 'This organisation';
    try {
      const company = await companyService.getCompany(badge.companyId);
      if (company && company.name) orgName = company.name;
    } catch (_) { /* company lookup is best-effort for the preview */ }
    const meta = badgeService.getBadgeMetadata(badge.tier);
    return { badge, orgName, meta };
  };

  // --- HTML verification page -------------------------------------------------
  router.get('/verify/:token', async (req, res, next) => {
    try {
      const data = await loadBadge(req.params.token);
      const origin = originOf(req);

      if (!data) {
        return res.status(404).type('html').send(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Badge not found — CertifAI</title>
<meta property="og:title" content="CertifAI badge — not valid"/>
<meta property="og:description" content="This verification link is invalid or the badge has expired."/>
<style>body{font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0}.c{text-align:center;padding:2rem}</style>
</head><body><div class="c"><h1>Badge not found</h1><p>This verification link is invalid or the badge has expired.</p></div></body></html>`);
      }

      const { badge, orgName, meta } = data;
      const tierLabel = meta.label;
      const scorePct = Math.round((Number(badge.score) || 0) * 20); // 0-5 → 0-100%
      const imageUrl = `${origin}/verify/${encodeURIComponent(badge.verificationToken)}/badge.svg`;
      const pageUrl = `${origin}/verify/${encodeURIComponent(badge.verificationToken)}`;
      const title = `${orgName} — CertifAI ${tierLabel} Badge`;
      const description = `Verified AI Governance Readiness: ${tierLabel} tier (${scorePct}%). Issued ${fmtDate(badge.issuedAt)}, valid until ${fmtDate(badge.expiresAt)}. Independently verifiable.`;
      const frameworks = Array.isArray(badge.frameworksIncluded) ? badge.frameworksIncluded : [];

      res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"/>

<!-- OpenGraph (LinkedIn, Facebook, Slack, WhatsApp) -->
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="CertifAI"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
<meta property="og:url" content="${escapeHtml(pageUrl)}"/>
<meta property="og:image" content="${escapeHtml(imageUrl)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escapeHtml(title)}"/>
<meta name="twitter:description" content="${escapeHtml(description)}"/>
<meta name="twitter:image" content="${escapeHtml(imageUrl)}"/>

<style>
  :root{--bg:#0b1220;--card:#111a2e;--line:#233048;--txt:#e6edf7;--mute:#93a4c0;--accent:${meta.color}}
  *{box-sizing:border-box}
  body{margin:0;font-family:Inter,system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--txt);display:grid;place-items:center;min-height:100vh;padding:1.5rem}
  .card{width:100%;max-width:560px;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
  .top{padding:1.5rem 1.75rem;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:.6rem}
  .brand{font-weight:700;letter-spacing:.3px}
  .verified{margin-left:auto;font-size:.78rem;color:#22c55e;display:inline-flex;align-items:center;gap:.35rem;font-weight:600}
  .body{padding:1.75rem}
  .tier{display:inline-flex;align-items:center;gap:.5rem;background:color-mix(in srgb,var(--accent) 18%, transparent);color:var(--accent);border:1px solid var(--accent);padding:.35rem .75rem;border-radius:999px;font-weight:700;font-size:.9rem}
  h1{font-size:1.5rem;margin:1rem 0 .25rem}
  .sub{color:var(--mute);margin:0 0 1.5rem}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem}
  .kv{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:.85rem 1rem}
  .kv .k{font-size:.72rem;text-transform:uppercase;letter-spacing:.5px;color:var(--mute)}
  .kv .v{font-size:1.05rem;font-weight:700;margin-top:.2rem}
  .fw{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.25rem}
  .chip{font-size:.72rem;background:var(--bg);border:1px solid var(--line);color:var(--mute);padding:.25rem .55rem;border-radius:6px}
  .tok{font-size:.72rem;color:var(--mute);word-break:break-all;margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--line)}
</style>
</head>
<body>
  <div class="card">
    <div class="top">
      <span class="brand">CertifAI</span>
      <span class="verified">✓ Verified credential</span>
    </div>
    <div class="body">
      <span class="tier">${escapeHtml(meta.icon)} ${escapeHtml(tierLabel)}</span>
      <h1>${escapeHtml(orgName)}</h1>
      <p class="sub">AI Governance Readiness — independently verifiable badge</p>
      <div class="grid">
        <div class="kv"><div class="k">Readiness score</div><div class="v">${scorePct}%</div></div>
        <div class="kv"><div class="k">Tier</div><div class="v">${escapeHtml(tierLabel)}</div></div>
        <div class="kv"><div class="k">Issued</div><div class="v">${fmtDate(badge.issuedAt)}</div></div>
        <div class="kv"><div class="k">Valid until</div><div class="v">${fmtDate(badge.expiresAt)}</div></div>
      </div>
      ${frameworks.length ? `<div class="kv"><div class="k">Frameworks assessed</div><div class="fw">${frameworks.map(f => `<span class="chip">${escapeHtml(f)}</span>`).join('')}</div></div>` : ''}
      <div class="tok">Verification token: ${escapeHtml(badge.verificationToken)}</div>
    </div>
  </div>
</body>
</html>`);
    } catch (err) {
      next(err);
    }
  });

  // --- OpenGraph image (SVG) --------------------------------------------------
  // NOTE: SVG works for Slack/X and direct rendering. LinkedIn's scraper is
  // unreliable with SVG og:image — for guaranteed LinkedIn thumbnails, render
  // this to PNG at deploy time (e.g. sharp/@resvg) and point og:image at it.
  router.get('/verify/:token/badge.svg', async (req, res, next) => {
    try {
      const data = await loadBadge(req.params.token);
      if (!data) return res.status(404).send('Not found');
      const { badge, orgName, meta } = data;
      const scorePct = Math.round((Number(badge.score) || 0) * 20);
      const accent = meta.color;
      const esc = (s) => escapeHtml(s);
      const org = orgName.length > 34 ? orgName.slice(0, 33) + '…' : orgName;

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#111a2e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="14" height="630" fill="${accent}"/>
  <text x="80" y="120" fill="#93a4c0" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="600" letter-spacing="2">CERTIFAI · AI GOVERNANCE READINESS</text>
  <text x="80" y="240" fill="#e6edf7" font-family="Inter,Arial,sans-serif" font-size="72" font-weight="700">${esc(org)}</text>
  <rect x="80" y="300" width="360" height="86" rx="43" fill="none" stroke="${accent}" stroke-width="3"/>
  <text x="130" y="357" fill="${accent}" font-family="Inter,Arial,sans-serif" font-size="46" font-weight="700">${esc(meta.icon)} ${esc(meta.label)}</text>
  <text x="80" y="500" fill="#93a4c0" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="600">Readiness score</text>
  <text x="80" y="560" fill="#e6edf7" font-family="Inter,Arial,sans-serif" font-size="60" font-weight="700">${scorePct}%</text>
  <text x="1120" y="560" text-anchor="end" fill="#22c55e" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="600">✓ Verified credential</text>
</svg>`;

      res.type('image/svg+xml').set('Cache-Control', 'public, max-age=300').send(svg);
    } catch (err) {
      next(err);
    }
  });

  return router;
};

module.exports = { createVerifyRoutes };
