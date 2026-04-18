/**
 * Helper functions for interacting with Outlook on the web (Japanese UI).
 *
 * NOTE: All locators use CSS attribute selectors ([aria-label="..."]) instead
 * of Playwright's getByRole(), because getByRole() relies on the accessibility
 * tree which is not reliably available when connected via CDP (connectOverCDP).
 * CSS selectors query the DOM directly and work regardless of connection mode.
 *
 * Actual UI labels confirmed by inspection:
 *   - To field   : [contenteditable][aria-label="宛先"]
 *   - Subject    : [aria-label="科目"]
 *   - Body       : [aria-label="メッセージを追加"]
 *   - Send       : button[aria-label="送信"]
 *   - Discard    : button[aria-label="破棄"]
 *   - New compose: keyboard shortcut "n"
 *   - Settings   : button[aria-label="FlexConfirmMail"]
 */

/**
 * Wait for Outlook's mail view to be fully loaded.
 * Accepts any Outlook on the web subdomain.
 */
export async function waitForOutlookReady(page) {
  // Outlook on the web may use several subdomains depending on tenant/region
  await page.waitForURL(
    /outlook\.(office(365)?\.com|cloud\.microsoft)\/mail\//,
    { timeout: 30_000 }
  );
}

/**
 * Discard the compose pane if it is currently open.
 * Safe to call even if no compose pane is open.
 */
export async function discardComposeIfOpen(page) {
  try {
    const discardBtn = page.locator('button[aria-label="破棄"]');
    const isOpen = await discardBtn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (!isOpen) return;

    await discardBtn.click();
    // Confirm the "discard changes?" prompt if it appears.
    // Scope to the dialog that contains the "メッセージの破棄" heading to avoid
    // accidentally clicking other "OK" buttons on the page.
    await page
      .locator('.fui-DialogBody:has(h2:has-text("メッセージの破棄")) button:has-text("OK")')
      .first()
      .click({ timeout: 3_000 })
      .catch(() => {});
    // Wait for the compose to actually close rather than a fixed delay.
    await discardBtn.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  } catch {
    // Page may have navigated or closed during discard — safe to ignore.
  }
}

/**
 * Open a new compose pane using the keyboard shortcut "n".
 * Waits until the FlexConfirmMail button appears in the compose toolbar.
 */
export async function openNewCompose(page) {
  await page.keyboard.press("n");
  await page
    .locator('button[aria-label="FlexConfirmMail"]')
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });
}

/**
 * Open the FlexConfirmMail settings dialog from the compose toolbar.
 * Returns the FrameLocator for the settings dialog iframe.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<import("@playwright/test").FrameLocator>}
 */
export async function openSettingsFromCompose(page) {
  await page.locator('button[aria-label="FlexConfirmMail"]').first().click();
  return waitForAddinDialog(page, "setting.html");
}

/**
 * In the settings dialog, set a checkbox to the desired state, save,
 * and wait for the dialog iframe to fully close.
 *
 * @param {import("@playwright/test").Page} page
 * @param {import("@playwright/test").FrameLocator} settingFrame
 * @param {string} checkboxId  Element ID of the fluent-checkbox (e.g. "countEnabled")
 * @param {boolean} checked    Desired checked state
 */
export async function setCheckboxAndSave(page, settingFrame, checkboxId, checked) {
  const checkbox = settingFrame.locator(`#${checkboxId}`);
  await checkbox.waitFor({ state: "visible" });

  const currentState = await checkbox.evaluate((el) => el.checked);
  if (currentState !== checked) {
    await checkbox.click();
  }

  await settingFrame.locator("#save-button").click();
  // Wait for the settings iframe to fully close before proceeding
  await waitForAddinDialogClosed(page, "setting.html");
}

/**
 * Wait until an add-in dialog iframe (identified by URL fragment) is gone.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} urlFragment  e.g. "setting.html"
 * @param {number} [timeout=10000]
 */
export async function waitForAddinDialogClosed(page, urlFragment, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const stillOpen = page.frames().some((f) => f.url().includes(urlFragment));
    if (!stillOpen) return;
    await page.waitForTimeout(200);
  }
  throw new Error(`Add-in dialog "${urlFragment}" did not close within ${timeout}ms`);
}

/**
 * Fill in and send a test email from an already-open compose pane.
 *
 * @param {import("@playwright/test").Page} page
 * @param {{ to: string, subject: string, body: string }} options
 */
export async function fillAndSendMail(page, { to, subject, body }) {
  // To: contenteditable field
  const toField = page.locator("[contenteditable='true'][aria-label='宛先']");
  await toField.click();
  await toField.fill(to);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);

  // Subject
  await page.locator('[aria-label="科目"]').click();
  await page.locator('[aria-label="科目"]').fill(subject);

  // Body (textarea identified by placeholder attribute)
  await page.locator('textarea[placeholder="メッセージを追加"]').click();
  await page.locator('textarea[placeholder="メッセージを追加"]').fill(body);

  // Send
  await page.locator('button[aria-label="送信"]').first().click();
}

/**
 * In the FlexConfirmMail confirmation dialog, check all checkboxes
 * then click the Send button.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<import("@playwright/test").FrameLocator>}
 */
export async function confirmAllAndSend(page) {
  const confirmFrame = await waitForAddinDialog(page, "confirm.html");

  // Wait for at least one fluent-checkbox to appear before counting.
  // Web components need extra time to register and render after iframe load.
  await confirmFrame.locator("fluent-checkbox").first()
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => {});

  // Check all unchecked checkboxes (no class filter — .check-target is unreliable)
  const checkboxes = confirmFrame.locator("fluent-checkbox");
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) {
    const cb = checkboxes.nth(i);
    const isChecked = await cb.evaluate((el) => el.checked);
    if (!isChecked) {
      await cb.click();
    }
  }

  // Wait for send button to become enabled, then click
  await confirmFrame.locator("#send-button:not([disabled])").waitFor({ timeout: 10_000 });
  await confirmFrame.locator("#send-button").click();

  return confirmFrame;
}

/**
 * Wait for an Office Add-in dialog iframe loading the given URL fragment.
 * Returns a FrameLocator pointing at that iframe.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} urlFragment   e.g. "setting.html", "confirm.html"
 * @param {number} [timeout=15000]
 * @returns {Promise<import("@playwright/test").FrameLocator>}
 */
export async function waitForAddinDialog(page, urlFragment, timeout = 15_000) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      if (frame.url().includes(urlFragment)) {
        const fl = page.frameLocator(`iframe[src*="${urlFragment}"]`);
        const ready = await fl
          .locator("body")
          .waitFor({ state: "visible", timeout: 3_000 })
          .then(() => true)
          .catch(() => false);
        if (ready) return fl;
      }
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`Add-in dialog "${urlFragment}" did not appear within ${timeout}ms`);
}
