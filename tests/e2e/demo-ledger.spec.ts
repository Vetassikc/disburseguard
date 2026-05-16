import { expect, test } from "@playwright/test";

test("runs the primary LIMIT clearance and exposes ledger verification", async ({ page }) => {
  await page.goto("/demo");

  await expect(page.getByRole("heading", { name: "Proof-Paid Treasury Firewall" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payout held before paid evidence" })).toBeVisible();
  await page.getByRole("button", { name: /Run clearance/i }).click();

  await expect(page.getByRole("heading", { name: "402 Payment Required" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "LIMIT", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "High-value payout capped before funds move" })).toBeVisible();
  await expect(page.getByText("HTTP 402 required")).toBeVisible();
  await expect(page.getByText("valid chain").first()).toBeVisible();

  await page.goto("/ledger");

  await expect(page.getByRole("heading", { name: "Ledger" })).toBeVisible();
  await expect(page.getByText("valid chain").first()).toBeVisible();
  await expect(page.getByText("CLEARANCE PACKET SIGNED").first()).toBeVisible();
});
