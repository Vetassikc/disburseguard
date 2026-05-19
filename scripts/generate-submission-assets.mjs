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

const slides = [
  {
    kicker: "DISBURSEGUARD",
    title: "Proof-Paid Treasury Firewall",
    body: "No proof, no payout. AI payout agents must buy, verify, sign, and ledger proof before company money can move.",
    proof: ["x402-style paid proof gates", "Gemini extraction", "Vultr-backed ledger"],
  },
  {
    kicker: "PROBLEM",
    title: "Autonomous agents can move faster than treasury controls",
    body: "AI agents can parse invoices and trigger workflows, but most financial controls still rely on after-the-fact dashboards or human review queues.",
    proof: ["Risk appears before audit", "Summaries are not proof", "Payment authorization needs an enforceable pre-payout gate"],
  },
  {
    kicker: "SOLUTION",
    title: "Turn proof into a paid prerequisite",
    body: "The agent must request protected evidence endpoints, receive HTTP 402 payment metadata, buy proof receipts, and only then ask Policy Guard to decide.",
    proof: ["Vendor-risk proof", "Recipient-match proof", "Sanctions-screen proof", "Delivery-attestation proof"],
  },
  {
    kicker: "AGENT FLOW",
    title: "Every payout becomes a verifiable clearance run",
    body: "Payout intent -> Gemini extraction -> proof plan -> x402 proof gate -> paid receipts -> policy decision -> signed ClearancePacket -> ledger verification.",
    proof: ["Agent acts, not just displays", "Proof spend can stop after hard-risk signal", "Receipts are hash-linked into the decision"],
  },
  {
    kicker: "LIVE DEMO RESULT",
    title: "$0.39 of proof controls $50,000 of capital exposure",
    body: "In the high-value scenario, DisburseGuard caps a $75,000 request to $25,000, signs the packet with a production key, and verifies the event chain.",
    proof: ["Requested: USD 75,000", "Authorized: USD 25,000", "Ledger: postgres-drizzle valid chain"],
  },
  {
    kicker: "WHY IT WINS",
    title: "A protocol-shaped product, not another dashboard",
    body: "DisburseGuard creates an economic enforcement loop for AI finance: spend cents on paid proof before releasing thousands in company funds.",
    proof: ["Strong x402 fit", "B2B FinOps and compliance use case", "Public Vultr deployment with verifiable APIs"],
  },
];

await mkdir(outputDir, { recursive: true });
await sharp(coverSvg).png().resize(1600, 900).toFile(coverPng);

await writeFile(deckHtml, buildHtml(slides), "utf8");

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

for (const [index, slideData] of slides.entries()) {
  const slide = pptx.addSlide();
  slide.background = { color: "10110F" };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.35,
    y: 0.35,
    w: 12.63,
    h: 6.8,
    fill: { color: "191B17" },
    line: { color: "393A31", width: 1 },
  });
  slide.addText(slideData.kicker, {
    x: 0.65,
    y: 0.7,
    w: 3.4,
    h: 0.25,
    color: "C9B98B",
    fontSize: 10,
    bold: true,
    charSpace: 2,
  });
  slide.addText(slideData.title, {
    x: 0.65,
    y: 1.1,
    w: 7.15,
    h: 1.3,
    color: "F4F1E9",
    fontSize: index === 0 ? 36 : 31,
    bold: true,
    fit: "shrink",
  });
  slide.addText(slideData.body, {
    x: 0.68,
    y: 2.65,
    w: 6.55,
    h: 1.4,
    color: "AAA79D",
    fontSize: 16,
    breakLine: false,
    fit: "shrink",
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 8.15,
    y: 1.05,
    w: 4.25,
    h: 4.9,
    fill: { color: "20231D" },
    line: { color: index === 0 ? "8BD8A8" : "393A31", width: 1 },
  });
  slide.addText(slideData.proof.map((item) => `• ${item}`).join("\n"), {
    x: 8.55,
    y: 1.55,
    w: 3.55,
    h: 3.7,
    color: "F4F1E9",
    fontSize: 17,
    breakLine: false,
    fit: "shrink",
    paraSpaceAfterPt: 12,
  });
  slide.addText(`${index + 1} / ${slides.length}`, {
    x: 11.72,
    y: 6.65,
    w: 0.8,
    h: 0.2,
    color: "C9B98B",
    fontSize: 9,
    align: "right",
  });
}

await pptx.writeFile({ fileName: deckPptx });

console.log(JSON.stringify({ coverPng, deckPdf, deckPptx }, null, 2));

function buildHtml(items) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>DisburseGuard Submission Deck</title>
<style>
@page { size: 16in 9in; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; background: #10110f; font-family: Arial, Helvetica, sans-serif; color: #f4f1e9; }
.slide { width: 16in; height: 9in; page-break-after: always; padding: .62in; background: #10110f; }
.frame { height: 100%; border: 2px solid #393a31; background: #191b17; padding: .46in; display: grid; grid-template-columns: 1.6fr .9fr; gap: .42in; }
.kicker { color: #c9b98b; font-size: 18px; font-weight: 800; letter-spacing: 6px; margin-bottom: 22px; }
h1 { font-size: 56px; line-height: 1.02; margin: 0 0 28px; letter-spacing: 0; }
p { color: #aaa79d; font-size: 26px; line-height: 1.42; margin: 0; max-width: 820px; }
.proof { border: 2px solid #393a31; background: #20231d; padding: 34px; display: flex; flex-direction: column; justify-content: center; }
.proof div { border-bottom: 1px solid rgba(255,255,255,.12); padding: 20px 0; color: #f4f1e9; font-size: 26px; font-weight: 700; }
.proof div:first-child { color: #8bd8a8; }
.proof div:last-child { border-bottom: 0; }
.footer { align-self: end; color: #c9b98b; font-family: monospace; font-size: 15px; margin-top: auto; }
.left { display: flex; flex-direction: column; }
</style>
</head>
<body>
${items
  .map(
    (slide, index) => `<section class="slide">
  <div class="frame">
    <div class="left">
      <div class="kicker">${escapeHtml(slide.kicker)}</div>
      <h1>${escapeHtml(slide.title)}</h1>
      <p>${escapeHtml(slide.body)}</p>
      <div class="footer">${index + 1} / ${items.length}</div>
    </div>
    <aside class="proof">
      ${slide.proof.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}
    </aside>
  </div>
</section>`,
  )
  .join("\n")}
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
