/**
 * E2E tests for: メール送信前のカウントダウンを有効化する
 *
 * Corresponds to PreReleaseTests.md section:
 *   GUIによるユーザーパラメータ設定 > 一般設定 > メール送信前のカウントダウンを有効化する
 *
 * Prerequisites:
 *   1. Launch Edge with CDP:
 *        "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
 *          --remote-debugging-port=9222 ^
 *          --user-data-dir="%LOCALAPPDATA%\Microsoft\Edge\E2ETestProfile"
 *   2. Log in to Outlook on the web and confirm the add-in is installed.
 *   3. Run:  npm run test:e2e
 */
import { test, expect } from "@playwright/test";
import { connectToChrome } from "./helpers/chrome-cdp.mjs";
import {
  waitForOutlookReady,
  discardComposeIfOpen,
  openNewCompose,
  openSettingsFromCompose,
  setCheckboxAndSave,
  waitForAddinDialogClosed,
  fillAndSendMail,
  confirmAllAndSend,
  waitForAddinDialog,
} from "./helpers/outlook.mjs";

/** Shared browser/page across all tests in this suite */
let browser;
let page;

/** Self-send address: read once in beforeAll */
let selfEmail;

test.beforeAll(async () => {
  const conn = await connectToChrome();
  browser = conn.browser;
  page = conn.page;
  await waitForOutlookReady(page);
  console.log("Page URL:", page.url());
  selfEmail = await resolveCurrentUserEmail(page);
  console.log("Logged-in user:", selfEmail);
});

test.afterAll(async () => {
  await discardComposeIfOpen(page).catch(() => {});
  // Do NOT call browser.close() — on a CDP-connected browser it hangs
  // instead of disconnecting cleanly.  The Edge process stays open intentionally.
});

test.describe.serial("カウントダウンを有効化する", () => {
  // Start each test from a clean (no compose open) state
  test.beforeEach(async () => {
    await discardComposeIfOpen(page);
  });

  // ─────────────────────────────────────────────────────────────────
  test("デフォルト値確認: デフォルト設定が「ON（有効）」であること", async () => {
    await openNewCompose(page);

    const settingFrame = await openSettingsFromCompose(page);
    await settingFrame.locator("#reset-button").click();
    await page.waitForTimeout(500);

    const isChecked = await settingFrame
      .locator("#countEnabled")
      .evaluate((el) => el.checked);
    expect(isChecked).toBe(true);

    await settingFrame.locator("#cancel-button").click();
    await waitForAddinDialogClosed(page, "setting.html");
  });

  // ─────────────────────────────────────────────────────────────────
  test("有効な場合: カウントダウンダイアログが表示されること", async () => {
    // Settings: enable countdown
    await openNewCompose(page);
    const settingFrame = await openSettingsFromCompose(page);
    await settingFrame.locator("#reset-button").click();
    await page.waitForTimeout(500);
    await setCheckboxAndSave(page, settingFrame, "countEnabled", true);
    await page.waitForTimeout(500);

    // Compose and send
    await fillAndSendMail(page, {
      to: selfEmail,
      subject: "Test countdown enabled",
      body: "This is a test mail",
    });

    // Confirm dialog
    await confirmAllAndSend(page);

    // Countdown dialog must appear
    const countdownFrame = await waitForAddinDialog(page, "count-down.html");
    await expect(countdownFrame.locator("#message")).toBeVisible();
    await expect(countdownFrame.locator("#count")).toBeVisible();

    // Cancel → mail is NOT sent (compose window stays open)
    await countdownFrame.locator("#cancel-button").click();
    await page.waitForTimeout(500);
    await expect(page.locator('button[aria-label="送信"]').first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────
  test("有効な場合: キャンセルでメールが送信されないこと、待機完了で送信されること", async () => {
    // Settings: enable countdown
    await openNewCompose(page);
    const settingFrame = await openSettingsFromCompose(page);
    await settingFrame.locator("#reset-button").click();
    await page.waitForTimeout(500);
    await setCheckboxAndSave(page, settingFrame, "countEnabled", true);
    await page.waitForTimeout(500);

    // ── Cancel scenario ──
    await fillAndSendMail(page, {
      to: selfEmail,
      subject: "Test countdown cancel",
      body: "This is a test mail",
    });
    await confirmAllAndSend(page);

    let countdownFrame = await waitForAddinDialog(page, "count-down.html");
    await expect(countdownFrame.locator("#count")).toBeVisible();
    await countdownFrame.locator("#cancel-button").click();
    await page.waitForTimeout(500);

    // Compose window still open → mail was NOT sent
    await expect(page.locator('button[aria-label="送信"]').first()).toBeVisible();

    // ── Wait-for-completion scenario ──
    await page.locator('button[aria-label="送信"]').first().click();
    await confirmAllAndSend(page);

    countdownFrame = await waitForAddinDialog(page, "count-down.html");
    await expect(countdownFrame.locator("#count")).toBeVisible();

    // After countdown, compose window closes (mail sent).
    // Default countdown is 3 s; allow up to 15 s total.
    await expect(page.locator('button[aria-label="送信"]').first()).toBeHidden({
      timeout: 15_000,
    });
  });

  // ─────────────────────────────────────────────────────────────────
  test("無効な場合: カウントダウンダイアログが表示されないこと", async () => {
    // Settings: disable countdown
    await openNewCompose(page);
    const settingFrame = await openSettingsFromCompose(page);
    await settingFrame.locator("#reset-button").click();
    await page.waitForTimeout(500);
    await setCheckboxAndSave(page, settingFrame, "countEnabled", false);
    await page.waitForTimeout(500);

    // Compose and send
    await fillAndSendMail(page, {
      to: selfEmail,
      subject: "Test countdown disabled",
      body: "This is a test mail",
    });
    await confirmAllAndSend(page);

    // Wait a moment then confirm no countdown dialog appeared
    await page.waitForTimeout(5_000);
    const countdownFound = page.frames().some((f) => f.url().includes("count-down.html"));
    expect(countdownFound).toBe(false);
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Read the logged-in user's email address.
 * Tries multiple strategies:
 *   1. UPN from webshell iframe URL (most reliable)
 *   2. OUTLOOK_EMAIL environment variable (fallback)
 */
async function resolveCurrentUserEmail(page) {
  // Strategy 1: OWA REST API /api/v2.0/me (uses existing auth cookies)
  const fromApi = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/v2.0/me?$select=EmailAddress", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (r.ok) {
        const data = await r.json();
        return data?.EmailAddress ?? null;
      }
      console.warn("[resolveEmail] /api/v2.0/me status:", r.status);
    } catch (e) {
      console.warn("[resolveEmail] /api/v2.0/me error:", e.message);
    }
    return null;
  });
  if (fromApi && fromApi.includes("@")) return fromApi;

  // Strategy 2: OWA boot/global objects in the page's JS context
  const fromGlobal = await page.evaluate(() => {
    try {
      const candidates = [
        window?.$Config?.UserEmailAddress,
        window?.$Config?.SessionSettings?.UserEmailAddress,
        window?.$Config?.SessionSettings?.LogonEmailAddress,
        window?.outlookBootConfig?.userPrincipalName,
        // Newer OWA shell
        window?.__OWA_OFFLINE_SETTINGS__?.userPrincipalName,
        window?.__initialData__?.userPrincipalName,
      ];
      const found = candidates.find((v) => typeof v === "string" && v.includes("@"));
      console.warn("[resolveEmail] global candidates:", JSON.stringify(candidates));
      return found ?? null;
    } catch (e) {
      console.warn("[resolveEmail] global error:", e.message);
      return null;
    }
  });
  if (fromGlobal) return fromGlobal;

  // Strategy 3: read UPN from any iframe URL (webshell includes it)
  for (const frame of page.frames()) {
    const url = frame.url();
    const match = url.match(/[?&]upn=([^&%]+(?:%40|@)[^&]+)/);
    if (match) {
      const email = decodeURIComponent(match[1]);
      if (email.includes("@")) return email;
    }
    // Also check for mail= parameter
    const match2 = url.match(/[?&]mail=([^&%]+(?:%40|@)[^&]+)/);
    if (match2) {
      const email = decodeURIComponent(match2[1]);
      if (email.includes("@")) return email;
    }
  }

  // Strategy 4: env variable
  if (process.env.OUTLOOK_EMAIL) return process.env.OUTLOOK_EMAIL;

  // Strategy 5: dump frame URLs so the user knows what's available
  const frameUrls = page.frames().map((f) => f.url()).join("\n  ");
  throw new Error(
    "Could not determine the logged-in email.\n" +
    "Set the OUTLOOK_EMAIL environment variable to the test account's email address.\n" +
    "Current page URL: " + page.url() + "\n" +
    "Frame URLs:\n  " + frameUrls
  );
}
