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
    kicker: "01 / THESIS",
    title: "No proof. No payout.",
    body: "DisburseGuard is a proof-paid treasury firewall for AI payout agents. The agent must buy, verify, sign, and ledger proof before company money can move.",
    stat: "$0.39",
    statLabel: "proof spend controls $50K in capital exposure",
    proof: ["x402-style proof gates", "Gemini extraction", "Vultr Postgres ledger"],
  },
  {
    kicker: "02 / WHY NOW",
    title: "AI agents are crossing from advice into authorization.",
    body: "Summaries are not proof. A payout agent needs a pre-payout enforcement layer, not another dashboard after the money is gone.",
    stat: "$75K",
    statLabel: "sample payout request held before release",
    proof: ["Risk appears before audit", "Human queues do not scale", "Treasury needs machine-verifiable clearance"],
  },
  {
    kicker: "03 / PAID PROOF",
    title: "Evidence is protected by payment, not trust.",
    body: "Proof endpoints return HTTP 402 until the agent pays. Only paid receipts can enter the treasury policy decision.",
    stat: "402",
    statLabel: "payment required before proof access",
    proof: ["vendor-risk", "recipient-match", "sanctions-screen", "delivery-attestation"],
  },
  {
    kicker: "04 / AGENT WORKFLOW",
    title: "The product is an acting agent, not a passive dashboard.",
    body: "Intake Agent extracts context, Proof Agent creates the plan, Payment Agent buys receipts, Policy Guard decides, and Audit Agent signs the packet.",
    stat: "5",
    statLabel: "agents in one clearance loop",
    proof: ["Payout intent", "Proof plan", "Paid receipts", "Policy outcome", "Signed packet"],
  },
  {
    kicker: "05 / TREASURY DECISION",
    title: "Proof quality directly controls how much capital can move.",
    body: "In the live scenario, DisburseGuard limits a $75,000 payout to $25,000 and keeps $50,000 controlled until better proof arrives.",
    stat: "$25K",
    statLabel: "authorized from a $75K request",
    proof: ["CLEAR: verified release", "LIMIT: capped payout", "REVIEW: human queue", "BLOCK: hard stop"],
  },
  {
    kicker: "06 / VERIFICATION",
    title: "Every clearance becomes independently verifiable.",
    body: "The ClearancePacket contains proof hashes, policy version, expiry, rationale, public key, and signature. The ledger chains every event hash.",
    stat: "valid",
    statLabel: "packet signature and event chain",
    proof: ["production-key signature", "append-only event hashes", "/api/clearance/:id/verify"],
  },
  {
    kicker: "07 / WHY IT WINS",
    title: "A protocol-shaped product for autonomous finance.",
    body: "DisburseGuard aligns directly with x402 payments, Gemini, Vultr, B2B FinOps, compliance, and agentic workflows.",
    stat: "live",
    statLabel: "public Vultr deployment",
    proof: ["x402: paid proof primitive", "Gemini: extraction agent", "Vultr: deployed ledger", "FinOps: payout control"],
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
  slide.background = { color: "0B0C0A" };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.28,
    y: 0.28,
    w: 12.78,
    h: 6.95,
    fill: { color: "12140F" },
    line: { color: "3A3D32", width: 1 },
  });
  slide.addText(slideData.kicker, {
    x: 0.62,
    y: 0.68,
    w: 3.2,
    h: 0.26,
    color: "C9B98B",
    fontSize: 10,
    bold: true,
    charSpace: 2,
  });
  slide.addText(slideData.title, {
    x: 0.62,
    y: 1.05,
    w: 6.65,
    h: 1.65,
    color: "F7F3E8",
    fontSize: index === 0 ? 38 : 31,
    bold: true,
    fit: "shrink",
  });
  slide.addText(slideData.body, {
    x: 0.65,
    y: 2.86,
    w: 6.18,
    h: 1.2,
    color: "AAA79D",
    fontSize: 15,
    fit: "shrink",
    breakLine: false,
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.66,
    y: 4.65,
    w: 3.05,
    h: 1.42,
    fill: { color: index === 2 ? "1D1618" : "18231B" },
    line: { color: index === 2 ? "F08BA0" : "8BD8A8", width: 1.3 },
  });
  slide.addText(slideData.stat, {
    x: 0.92,
    y: 4.85,
    w: 2.5,
    h: 0.55,
    color: "F7F3E8",
    fontSize: 30,
    bold: true,
    fit: "shrink",
  });
  slide.addText(slideData.statLabel, {
    x: 0.92,
    y: 5.42,
    w: 2.5,
    h: 0.35,
    color: "AAA79D",
    fontSize: 10.5,
    fit: "shrink",
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 7.68,
    y: 0.78,
    w: 4.85,
    h: 5.72,
    fill: { color: "20231D" },
    line: { color: "3A3D32", width: 1 },
  });
  slide.addText(slideData.proof.map((item) => `• ${item}`).join("\n"), {
    x: 8.06,
    y: 1.25,
    w: 4.05,
    h: 4.45,
    color: "F7F3E8",
    fontSize: 16,
    bold: true,
    fit: "shrink",
    breakLine: false,
    paraSpaceAfterPt: 10,
  });
  slide.addText(`${index + 1} / ${slides.length}`, {
    x: 11.64,
    y: 6.82,
    w: 0.75,
    h: 0.18,
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
body { margin: 0; background: #0b0c0a; font-family: Arial, Helvetica, sans-serif; color: #f7f3e8; }
.slide { width: 16in; height: 9in; page-break-after: always; padding: .58in; background: #0b0c0a; }
.frame { height: 100%; border: 2px solid #3a3d32; background: #12140f; display: grid; grid-template-columns: 1.55fr .95fr; }
.left { padding: .55in .52in; display: flex; flex-direction: column; }
.right { border-left: 2px solid #2b2e26; background: #181b15; padding: .55in .48in; display: flex; flex-direction: column; justify-content: center; }
.kicker { color: #c9b98b; font-size: 17px; font-weight: 900; letter-spacing: 5px; margin-bottom: 26px; }
h1 { font-size: 58px; line-height: 1.02; margin: 0 0 28px; letter-spacing: 0; max-width: 800px; }
p { color: #aaa79d; font-size: 25px; line-height: 1.38; margin: 0; max-width: 780px; }
.metric { margin-top: auto; width: 390px; border: 3px solid #8bd8a8; background: #18231b; padding: 26px 30px; }
.metric.red { border-color: #f08ba0; background: #1d1618; }
.metric strong { display: block; color: #f7f3e8; font-size: 58px; line-height: .9; margin-bottom: 12px; }
.metric span { color: #aaa79d; font-size: 19px; line-height: 1.25; }
.proof-title { color: #c9b98b; font-size: 18px; font-weight: 900; letter-spacing: 4px; margin-bottom: 22px; }
.proof-item { border: 2px solid #3a3d32; background: #20231d; padding: 22px 24px; color: #f7f3e8; font-size: 25px; font-weight: 850; margin-bottom: 16px; }
.proof-item:first-of-type { border-color: #8bd8a8; }
.footer { color: #c9b98b; font-family: monospace; font-size: 15px; text-align: right; margin-top: 26px; }
</style>
</head>
<body>
${items
  .map(
    (slide, index) => `<section class="slide">
  <div class="frame">
    <main class="left">
      <div class="kicker">${escapeHtml(slide.kicker)}</div>
      <h1>${escapeHtml(slide.title)}</h1>
      <p>${escapeHtml(slide.body)}</p>
      <div class="metric ${slide.stat === "402" ? "red" : ""}">
        <strong>${escapeHtml(slide.stat)}</strong>
        <span>${escapeHtml(slide.statLabel)}</span>
      </div>
    </main>
    <aside class="right">
      <div class="proof-title">PROOF OBJECTS</div>
      ${slide.proof.map((item) => `<div class="proof-item">${escapeHtml(item)}</div>`).join("")}
      <div class="footer">${index + 1} / ${items.length}</div>
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
