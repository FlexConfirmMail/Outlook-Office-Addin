/**
 * Connect Playwright to an already-running Chromium-based browser via CDP.
 *
 * Supports both Google Chrome and Microsoft Edge.
 *
 * Usage:
 *   1. Close all browser windows.
 *   2. Launch the browser with the remote debugging port.
 *
 *      Chrome:
 *        "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
 *          --remote-debugging-port=9222 ^
 *          --user-data-dir="%LOCALAPPDATA%\Google\Chrome\E2ETestProfile"
 *
 *      Edge (recommended on Windows):
 *        "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
 *          --remote-debugging-port=9222 ^
 *          --user-data-dir="%LOCALAPPDATA%\Microsoft\Edge\E2ETestProfile"
 *
 *   3. Log in to Outlook on the web manually.
 *   4. Run the tests:  npm run test:e2e
 *
 * Notes:
 *   - A dedicated --user-data-dir is required for the debug port to work.
 *   - The CDP endpoint can be overridden with the CDP_ENDPOINT env variable.
 */
import { chromium } from "@playwright/test";

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";

/**
 * Connect to the running browser and return { browser, context, page }.
 *
 * - If a tab with Outlook is already open, it is reused.
 * - Otherwise the first available tab is navigated to Outlook.
 *
 * @returns {Promise<{ browser: import("@playwright/test").Browser,
 *                      context: import("@playwright/test").BrowserContext,
 *                      page: import("@playwright/test").Page }>}
 */
export async function connectToChrome() {
  const endpoint = process.env.CDP_ENDPOINT || DEFAULT_CDP_ENDPOINT;

  // chromium.connectOverCDP works with any Chromium-based browser (Chrome, Edge, etc.)
  const browser = await chromium.connectOverCDP(endpoint);

  // Reuse the first browser context (the default profile)
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error(
      "No browser context found. Make sure the browser is running with at least one window open."
    );
  }

  // Find an existing Outlook tab (any subdomain), or create one
  let page = context.pages().find(
    (p) => /outlook\.(office|cloud\.microsoft)/.test(p.url())
  );
  if (!page) {
    page = context.pages()[0] || (await context.newPage());
  }

  // outlook.cloud.microsoft uses a new shell where Playwright's accessibility
  // tree (getByRole) doesn't work reliably. Always use the classic
  // outlook.office365.com interface instead.
  if (!page.url().includes("outlook.office365.com")) {
    await page.goto("https://outlook.office365.com/mail/", { waitUntil: "networkidle" });
  }

  return { browser, context, page };
}
