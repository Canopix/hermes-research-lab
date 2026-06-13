/**
 * E2E: the AgentHub dashboard plugin renders inside the real Hermes dashboard.
 *
 * Requires the `hermes` binary in PATH.
 *
 * beforeAll: install the plugin, start `hermes dashboard` on its own port
 *   (so it doesn't clash with any dashboard you already have running), and wait
 *   for it to serve. Auth in loopback mode is via the token embedded in the
 *   served HTML, so we just navigate to the dashboard URL — no stdout parsing.
 * afterAll: stop the dashboard subprocess.
 */
import { test, expect } from "@playwright/test";
import { spawn, ChildProcess, execSync } from "child_process";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");
const PORT = Number(process.env.HERMES_DASHBOARD_PORT || 9120);
const BASE = `http://127.0.0.1:${PORT}`;

let dashboard: ChildProcess;

async function waitForHttp(url: string, timeoutMs = 90000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

test.beforeAll(async () => {
  execSync("bash scripts/install-plugin.sh", { cwd: ROOT });
  dashboard = spawn(
    "hermes",
    ["dashboard", "--no-open", "--skip-build", "--port", String(PORT)],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }
  );
  await waitForHttp(`${BASE}/`);
});

test.afterAll(() => {
  if (dashboard && !dashboard.killed) dashboard.kill("SIGTERM");
});

test("AgentHub tab renders the 4 templates", async ({ page }) => {
  // Load the dashboard root first so the session token (embedded in the HTML)
  // is established, then route to the AgentHub tab.
  await page.goto(`${BASE}/`);
  await page.goto(`${BASE}/agenthub`);

  const root = page.locator('[data-testid="agenthub-root"]');
  await expect(root).toBeVisible({ timeout: 20000 });

  const cards = page.locator('[data-testid="tpl-card"]');
  await expect(cards).toHaveCount(4);
  await expect(root).toContainText("AI Researcher");
});

test("Create tab shows the wizard", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.goto(`${BASE}/agenthub`);

  const root = page.locator('[data-testid="agenthub-root"]');
  await expect(root).toBeVisible({ timeout: 20000 });

  // Click the Create tab
  await page.locator('[data-testid="tab-create"]').click();

  // Click the AI Researcher template card
  const cards = page.locator('[data-testid="tpl-card"]');
  await expect(cards).toHaveCount(4);
  await cards.filter({ hasText: "AI Researcher" }).click();

  // Assert wizard form, agent name input, and create button are visible
  await expect(page.locator('[data-testid="wizard-form"]')).toBeVisible();
  await expect(page.locator('[data-testid="agent-name"]')).toBeVisible();
  await expect(page.locator('[data-testid="create-btn"]')).toBeVisible();
});
