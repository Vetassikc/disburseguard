import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const runtimeNodeModules =
  process.env.CODEX_RUNTIME_NODE_MODULES ??
  "/Users/vitaliiradionov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const pptxgen = require(path.join(runtimeNodeModules, "pptxgenjs"));
const sharp = require(path.join(runtimeNodeModules, "sharp"));
const { chromium } = require(path.join(runtimeNodeModules, "playwright"));

const root = process.cwd();
const outputDir = path.join(root, "artifacts", "submission");
const coverSvg = path.join(root, "public", "disburseguard-cover.svg");
const coverPng = path.join(outputDir, "disburseguard-cover.png");
const deckHtml = path.join(outputDir, "disburseguard-slides.html");
const deckPdf = path.join(outputDir, "disburseguard-slides.pdf");
const deckPptx = path.join(outputDir, "disburseguard-slides.pptx");

const colors = {
  ink: "111827",
  slate: "334155",
  muted: "64748B",
  porcelain: "F7F2E8",
  paper: "FFFBF2",
  cloud: "EEF4FF",
  line: "D8D2C4",
  cobalt: "245BFF",
  cobaltDark: "173A9E",
  mint: "36C78A",
  amber: "FFB020",
  coral: "FF5C7A",
  plum: "6D4AFF",
};

const slides = [
  {
    kicker: "01 / TREASURY CHECKPOINT",
    title: "AI agents can request money. Proof decides what moves.",
    body: "DisburseGuard turns payout authorization into a checkpoint: the agent must buy evidence, pass policy, sign clearance, and ledger the result before company funds can move.",
    stat: "$75K",
    statLabel: "payout request intercepted",
    accent: "cobalt",
    proof: ["Gemini extracts invoice context", "x402-style proof endpoints return HTTP 402", "Policy caps release to $25K"],
  },
  {
    kicker: "02 / THE GAP",
    title: "Dashboards explain risk after money already left.",
    body: "Autonomous finance needs enforcement before payout, not a prettier audit view after the agent has acted.",
    stat: "before",
    statLabel: "control moves in front of the payout",
    accent: "coral",
    proof: ["Agent summaries are not evidence", "Human queues do not scale", "Treasury needs machine-verifiable proof"],
  },
  {
    kicker: "03 / PAID PROOF",
    title: "Evidence is a paid gate, not a trusted checkbox.",
    body: "Protected proof endpoints deny access with HTTP 402. The Payment Agent must create receipts before evidence can influence the treasury decision.",
    stat: "402",
    statLabel: "payment required before proof access",
    accent: "amber",
    proof: ["vendor-risk", "recipient-match", "sanctions-screen", "delivery-attestation"],
  },
  {
    kicker: "04 / AGENT LOOP",
    title: "The demo acts through a full clearance chain.",
    body: "Intake Agent, Proof Agent, Payment Agent, Policy Guard, and Audit Agent complete one verifiable payout loop instead of only displaying status.",
    stat: "5",
    statLabel: "agents in the clearance loop",
    accent: "plum",
    proof: ["Extract", "Plan", "Pay", "Decide", "Sign and ledger"],
  },
  {
    kicker: "05 / LIVE RESULT",
    title: "$0.39 of proof spend controls $50K of exposure.",
    body: "In the high-value reserve scenario, DisburseGuard limits a $75,000 request to $25,000 and keeps the remaining $50,000 blocked until stronger proof arrives.",
    stat: "$50K",
    statLabel: "capital controlled before payout",
    accent: "mint",
    proof: ["requested: $75K", "proof spend: $0.39", "approved: $25K", "held: $50K"],
  },
  {
    kicker: "06 / VERIFIABLE LEDGER",
    title: "Every decision becomes a public verification object.",
    body: "The ClearancePacket carries proof hashes, policy version, expiry, rationale, public key, and signature. The Vultr Postgres ledger chains every event hash.",
    stat: "valid",
    statLabel: "packet signature and event chain",
    accent: "cobalt",
    proof: ["production-key signing mode", "append-only event hashes", "/api/clearance/:id/verify"],
  },
  {
    kicker: "07 / WHY IT WINS",
    title: "A payment primitive for agentic finance, not a generic dashboard.",
    body: "DisburseGuard aligns the strongest hackathon surfaces: x402 paid proof gates, Gemini extraction, Vultr deployment, B2B FinOps, compliance, and a multi-step agent workflow.",
    stat: "live",
    statLabel: "public Vultr deployment",
    accent: "plum",
    proof: ["x402: proof purchase primitive", "Gemini: structured intake", "Vultr: deployed ledger", "FinOps: payout control"],
  },
];

await mkdir(outputDir, { recursive: true });

const coverSvgMarkup = buildCoverSvg();
await writeFile(coverSvg, coverSvgMarkup, "utf8");
await sharp(Buffer.from(coverSvgMarkup)).png().resize(1600, 900).toFile(coverPng);

await writeFile(deckHtml, buildHtml(slides, coverSvgMarkup), "utf8");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`file://${deckHtml}`, { waitUntil: "networkidle" });
await page.pdf({
  path: deckPdf,
  width: "16in",
  height: "9in",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();

await buildPptx(slides);

console.log(JSON.stringify({ coverPng, deckPdf, deckPptx }, null, 2));

function buildCoverSvg() {
  return `<svg width="1600" height="900" viewBox="0 0 1600 900" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">DisburseGuard Treasury Checkpoint cover</title>
  <desc id="desc">A bright fintech cover showing an AI payout request stopped at a proof checkpoint before money can move.</desc>
  <rect width="1600" height="900" fill="#${colors.porcelain}"/>
  <path d="M0 716C230 626 418 709 640 650C872 588 1044 432 1262 485C1424 524 1510 651 1600 612V900H0V716Z" fill="#E9F0FF"/>
  <path d="M128 105H1472" stroke="#${colors.line}" stroke-width="2"/>
  <text x="128" y="74" fill="#${colors.ink}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="900" letter-spacing="5">DISBURSEGUARD</text>
  <text x="1280" y="74" fill="#${colors.slate}" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700">AI Agent Olympics</text>

  <text x="128" y="184" fill="#${colors.cobalt}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900" letter-spacing="4">PROOF-PAID TREASURY FIREWALL</text>
  <text x="128" y="286" fill="#${colors.ink}" font-family="Arial, Helvetica, sans-serif" font-size="82" font-weight="900">No proof.</text>
  <text x="128" y="376" fill="#${colors.ink}" font-family="Arial, Helvetica, sans-serif" font-size="82" font-weight="900">No payout.</text>
  <text x="132" y="428" fill="#${colors.slate}" font-family="Arial, Helvetica, sans-serif" font-size="28">AI payout agents must buy evidence before</text>
  <text x="132" y="466" fill="#${colors.slate}" font-family="Arial, Helvetica, sans-serif" font-size="28">company money can move.</text>

  <rect x="128" y="552" width="228" height="110" rx="28" fill="#${colors.paper}" stroke="#${colors.line}" stroke-width="2"/>
  <text x="158" y="592" fill="#${colors.muted}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="900" letter-spacing="2">REQUEST</text>
  <text x="158" y="641" fill="#${colors.ink}" font-family="Arial, Helvetica, sans-serif" font-size="45" font-weight="900">$75K</text>
  <rect x="384" y="552" width="228" height="110" rx="28" fill="#FFF2C8" stroke="#${colors.amber}" stroke-width="3"/>
  <text x="414" y="592" fill="#9A6500" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="900" letter-spacing="2">PROOF SPEND</text>
  <text x="414" y="641" fill="#${colors.ink}" font-family="Arial, Helvetica, sans-serif" font-size="45" font-weight="900">$0.39</text>
  <rect x="128" y="692" width="484" height="88" rx="28" fill="#E5FFF3" stroke="#${colors.mint}" stroke-width="3"/>
  <text x="158" y="728" fill="#087A4C" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="900" letter-spacing="2">CAPITAL CONTROLLED BEFORE PAYOUT</text>
  <text x="158" y="766" fill="#${colors.ink}" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="900">$50K</text>
  <text x="282" y="762" fill="#${colors.slate}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800">held before payout</text>

  <rect x="760" y="150" width="692" height="422" rx="42" fill="#${colors.paper}" stroke="#${colors.ink}" stroke-width="3"/>
  <rect x="804" y="194" width="604" height="86" rx="26" fill="#${colors.cloud}" stroke="#B7C8FF" stroke-width="2"/>
  <text x="836" y="230" fill="#${colors.cobaltDark}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="900" letter-spacing="2">AI AGENT PAYOUT REQUEST</text>
  <text x="836" y="264" fill="#${colors.ink}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900">Hardware reserve invoice - $75,000</text>

  <path d="M866 372H1028" stroke="#${colors.line}" stroke-width="10" stroke-linecap="round"/>
  <path d="M1020 348L1050 372L1020 396" stroke="#${colors.line}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M1182 372H1320" stroke="#${colors.line}" stroke-width="10" stroke-linecap="round"/>
  <path d="M1312 348L1342 372L1312 396" stroke="#${colors.line}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>

  <rect x="830" y="326" width="154" height="96" rx="24" fill="#FFFFFF" stroke="#${colors.line}" stroke-width="2"/>
  <text x="858" y="362" fill="#${colors.muted}" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="900" letter-spacing="2">INTENT</text>
  <text x="858" y="397" fill="#${colors.ink}" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="900">$75K</text>

  <rect x="1038" y="300" width="168" height="146" rx="32" fill="#${colors.ink}" stroke="#${colors.coral}" stroke-width="4"/>
  <text x="1074" y="340" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900" letter-spacing="2">HTTP 402</text>
  <text x="1074" y="382" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="900">Proof</text>
  <text x="1074" y="418" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="900">Gate</text>

  <rect x="1340" y="326" width="52" height="96" rx="26" fill="#${colors.mint}"/>
  <rect x="1270" y="326" width="124" height="96" rx="24" fill="#E5FFF3" stroke="#${colors.mint}" stroke-width="3"/>
  <text x="1296" y="362" fill="#087A4C" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="900" letter-spacing="2">CLEARED</text>
  <text x="1296" y="397" fill="#${colors.ink}" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="900">$25K</text>

  <g transform="translate(1076 488) rotate(-8)">
    <rect x="0" y="0" width="210" height="54" rx="27" fill="#FFFFFF" stroke="#${colors.cobalt}" stroke-width="3"/>
    <text x="27" y="36" fill="#${colors.cobalt}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="900" letter-spacing="2">PAID PROOF</text>
  </g>

  <rect x="820" y="626" width="596" height="120" rx="34" fill="#${colors.ink}"/>
  <text x="858" y="671" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="900">Signed ClearancePacket + Vultr ledger</text>
  <circle cx="872" cy="716" r="11" fill="#${colors.cobalt}"/>
  <line x1="883" y1="716" x2="978" y2="716" stroke="#FFFFFF" stroke-width="3" opacity=".6"/>
  <circle cx="1000" cy="716" r="11" fill="#${colors.amber}"/>
  <line x1="1011" y1="716" x2="1106" y2="716" stroke="#FFFFFF" stroke-width="3" opacity=".6"/>
  <circle cx="1128" cy="716" r="11" fill="#${colors.mint}"/>
  <line x1="1139" y1="716" x2="1234" y2="716" stroke="#FFFFFF" stroke-width="3" opacity=".6"/>
  <circle cx="1256" cy="716" r="11" fill="#${colors.coral}"/>
  <text x="1290" y="723" fill="#BFD0FF" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800">verify API</text>
  <text x="128" y="836" fill="#${colors.slate}" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="800">Gemini extraction + x402-style proof payments + deterministic policy + signed ledger verification</text>
</svg>`;
}

function buildHtml(items, coverSvgMarkup) {
  const coverDataUri = `data:image/svg+xml;base64,${Buffer.from(coverSvgMarkup).toString("base64")}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>DisburseGuard Submission Deck</title>
<style>
@page { size: 16in 9in; margin: 0; }
* { box-sizing: border-box; }
:root {
  --ink: #${colors.ink};
  --slate: #${colors.slate};
  --muted: #${colors.muted};
  --porcelain: #${colors.porcelain};
  --paper: #${colors.paper};
  --cloud: #${colors.cloud};
  --line: #${colors.line};
  --cobalt: #${colors.cobalt};
  --mint: #${colors.mint};
  --amber: #${colors.amber};
  --coral: #${colors.coral};
  --plum: #${colors.plum};
}
body { margin: 0; background: var(--porcelain); font-family: Arial, Helvetica, sans-serif; color: var(--ink); }
.slide { width: 16in; height: 9in; page-break-after: always; padding: .62in; background: var(--porcelain); position: relative; overflow: hidden; }
.cover { padding: 0; }
.cover img { width: 16in; height: 9in; display: block; }
.wave { position: absolute; left: 0; right: 0; bottom: 0; height: 2.15in; background: #e9f0ff; clip-path: polygon(0 45%, 13% 30%, 27% 48%, 44% 25%, 63% 52%, 80% 33%, 100% 46%, 100% 100%, 0 100%); }
.shell { position: relative; z-index: 1; height: 100%; border: 2px solid var(--line); border-radius: 34px; background: rgba(255,251,242,.88); padding: .54in; display: grid; grid-template-columns: 1.08fr .92fr; gap: .46in; }
.slide:nth-child(3n) .shell { background: #fffaf0; }
.slide:nth-child(4n) .shell { background: #f9fbff; }
.kicker { color: var(--cobalt); font-size: 16px; font-weight: 900; letter-spacing: 4px; margin-bottom: 24px; text-transform: uppercase; }
.coral .kicker { color: var(--coral); }
.amber .kicker { color: #9a6500; }
.mint .kicker { color: #087a4c; }
.plum .kicker { color: var(--plum); }
h1 { font-size: 54px; line-height: 1.03; margin: 0 0 24px; letter-spacing: 0; max-width: 760px; }
p { color: var(--slate); font-size: 23px; line-height: 1.38; margin: 0; max-width: 740px; }
.metric { margin-top: auto; width: 3.75in; border-radius: 28px; padding: 25px 30px; background: var(--ink); color: #fff; box-shadow: 0 18px 40px rgba(17,24,39,.14); }
.metric strong { display: block; font-size: 61px; line-height: .92; margin-bottom: 10px; }
.metric span { color: #dbeafe; font-size: 18px; line-height: 1.25; }
.visual { align-self: stretch; border-radius: 34px; background: #fff; border: 2px solid var(--line); padding: .34in; box-shadow: 0 24px 54px rgba(17,24,39,.12); display: flex; flex-direction: column; justify-content: center; }
.checkpoint { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; gap: 18px; margin-bottom: 28px; }
.node { min-height: 108px; border-radius: 26px; border: 2px solid var(--line); padding: 18px 20px; background: #fffaf0; }
.node small { display: block; color: var(--muted); font-size: 13px; font-weight: 900; letter-spacing: 2px; margin-bottom: 12px; text-transform: uppercase; }
.node b { color: var(--ink); font-size: 30px; line-height: 1; }
.gate { background: var(--ink); color: #fff; border-color: var(--coral); }
.gate small, .gate b { color: #fff; }
.approved { background: #e5fff3; border-color: var(--mint); }
.proof-list { display: grid; gap: 13px; }
.proof-item { border: 2px solid var(--line); border-radius: 20px; padding: 17px 19px; color: var(--ink); font-size: 20px; font-weight: 900; background: #f8fafc; }
.proof-item:first-child { border-color: var(--cobalt); background: var(--cloud); }
.chain { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 24px; }
.chain div { height: 70px; border-radius: 20px; color: #fff; background: var(--ink); display: grid; place-items: center; font-size: 16px; font-weight: 900; text-align: center; padding: 0 8px; }
.chain div:nth-child(2) { background: var(--cobalt); }
.chain div:nth-child(3) { background: var(--plum); }
.chain div:nth-child(4) { background: #087a4c; }
.footer { position: absolute; right: .78in; bottom: .76in; color: var(--muted); font-size: 14px; font-weight: 800; }
</style>
</head>
<body>
<section class="slide cover"><img src="${coverDataUri}" alt="DisburseGuard Treasury Checkpoint cover" /></section>
${items
  .slice(1)
  .map((slide, index) => `<section class="slide ${escapeHtml(slide.accent)}">
  <div class="wave"></div>
  <div class="shell">
    <main style="display:flex;flex-direction:column;">
      <div class="kicker">${escapeHtml(slide.kicker)}</div>
      <h1>${escapeHtml(slide.title)}</h1>
      <p>${escapeHtml(slide.body)}</p>
      <div class="metric">
        <strong>${escapeHtml(slide.stat)}</strong>
        <span>${escapeHtml(slide.statLabel)}</span>
      </div>
    </main>
    <aside class="visual">
      ${buildSlideVisual(slide)}
    </aside>
  </div>
  <div class="footer">${index + 2} / ${items.length}</div>
</section>`)
  .join("\n")}
</body>
</html>`;
}

function buildSlideVisual(slide) {
  if (slide.kicker.includes("THE GAP")) {
    return `<div class="checkpoint">
      <div class="node"><small>invoice</small><b>PDF</b></div>
      <div class="node gate"><small>agent summary</small><b>looks safe</b></div>
      <div class="node"><small>audit</small><b>too late</b></div>
    </div>
    <div class="proof-list">${slide.proof.map((item) => `<div class="proof-item">${escapeHtml(item)}</div>`).join("")}</div>`;
  }
  if (slide.kicker.includes("PAID PROOF")) {
    return `<div class="checkpoint">
      <div class="node"><small>request</small><b>proof</b></div>
      <div class="node gate"><small>HTTP</small><b>402</b></div>
      <div class="node approved"><small>receipt</small><b>paid</b></div>
    </div>
    <div class="proof-list">${slide.proof.map((item) => `<div class="proof-item">${escapeHtml(item)}</div>`).join("")}</div>`;
  }
  if (slide.kicker.includes("LIVE RESULT")) {
    return `<div class="checkpoint">
      <div class="node"><small>requested</small><b>$75K</b></div>
      <div class="node approved"><small>approved</small><b>$25K</b></div>
      <div class="node gate"><small>held</small><b>$50K</b></div>
    </div>
    <div class="proof-list">${slide.proof.map((item) => `<div class="proof-item">${escapeHtml(item)}</div>`).join("")}</div>`;
  }
  if (slide.kicker.includes("VERIFIABLE")) {
    return `<div class="chain"><div>intent</div><div>proof</div><div>packet</div><div>verify</div></div>
    <div class="proof-list" style="margin-top:28px;">${slide.proof.map((item) => `<div class="proof-item">${escapeHtml(item)}</div>`).join("")}</div>`;
  }
  return `<div class="checkpoint">
    <div class="node"><small>agent</small><b>acts</b></div>
    <div class="node gate"><small>checkpoint</small><b>proof</b></div>
    <div class="node approved"><small>treasury</small><b>safe</b></div>
  </div>
  <div class="proof-list">${slide.proof.map((item) => `<div class="proof-item">${escapeHtml(item)}</div>`).join("")}</div>`;
}

async function buildPptx(items) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "DisburseGuard";
  pptx.subject = "AI Agent Olympics submission deck";
  pptx.title = "DisburseGuard";
  pptx.company = "DisburseGuard";
  pptx.lang = "en-US";
  pptx.theme = {
    headFontFace: "Arial",
    bodyFontFace: "Arial",
    lang: "en-US",
  };

  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: colors.porcelain };
  coverSlide.addImage({ path: coverPng, x: 0, y: 0, w: 13.333, h: 7.5 });

  for (const [index, slideData] of items.slice(1).entries()) {
    const slide = pptx.addSlide();
    const accent = colors[slideData.accent] ?? colors.cobalt;
    slide.background = { color: colors.porcelain };
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 0.45,
      w: 12.43,
      h: 6.6,
      rectRadius: 0.18,
      fill: { color: colors.paper, transparency: 0 },
      line: { color: colors.line, width: 1 },
    });
    slide.addText(slideData.kicker, {
      x: 0.86,
      y: 0.85,
      w: 4.6,
      h: 0.25,
      color: accent,
      fontSize: 10,
      bold: true,
      charSpace: 2,
    });
    slide.addText(slideData.title, {
      x: 0.86,
      y: 1.22,
      w: 6.1,
      h: 1.35,
      color: colors.ink,
      fontSize: 30,
      bold: true,
      fit: "shrink",
    });
    slide.addText(slideData.body, {
      x: 0.88,
      y: 2.84,
      w: 5.75,
      h: 1.05,
      color: colors.slate,
      fontSize: 14,
      fit: "shrink",
      breakLine: false,
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.88,
      y: 4.72,
      w: 3.25,
      h: 1.18,
      rectRadius: 0.18,
      fill: { color: colors.ink },
      line: { color: colors.ink, width: 1 },
    });
    slide.addText(slideData.stat, {
      x: 1.15,
      y: 4.91,
      w: 2.7,
      h: 0.45,
      color: "FFFFFF",
      fontSize: 27,
      bold: true,
      fit: "shrink",
    });
    slide.addText(slideData.statLabel, {
      x: 1.15,
      y: 5.39,
      w: 2.58,
      h: 0.28,
      color: "DBEAFE",
      fontSize: 9.8,
      fit: "shrink",
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.25,
      y: 1.02,
      w: 4.8,
      h: 4.98,
      rectRadius: 0.2,
      fill: { color: "FFFFFF" },
      line: { color: colors.line, width: 1 },
    });
    slide.addText(slideData.proof.map((item) => `- ${item}`).join("\n"), {
      x: 7.68,
      y: 1.56,
      w: 4.0,
      h: 3.85,
      color: colors.ink,
      fontSize: 16,
      bold: true,
      fit: "shrink",
      paraSpaceAfterPt: 10,
      breakLine: false,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 7.6,
      y: 5.64,
      w: 3.85,
      h: 0,
      line: { color: accent, width: 3 },
    });
    slide.addText(`${index + 2} / ${items.length}`, {
      x: 11.35,
      y: 6.65,
      w: 0.48,
      h: 0.18,
      color: colors.muted,
      fontSize: 8,
      align: "right",
    });
  }

  await pptx.writeFile({ fileName: deckPptx });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
