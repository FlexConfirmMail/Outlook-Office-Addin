import { L10n } from "./l10n.mjs";

export class SafeBccConfirmation {
  shouldConfirm = false;
  threshold = 0;
  locale = null;

  constructor(language) {
    this.locale = L10n.get(language);
  }

  init(data) {
    if (!data.config.common.SafeBccEnabled) {
      return;
    }

    this.threshold = data.config.common.SafeBccThreshold;
    if (this.threshold < 1) {
      return;
    }

    const recipients = [...data.target.to, ...data.target.cc];
    const domains = new Set(recipients.map((recipient) => recipient.domain));
    this.shouldConfirm = domains.size >= this.threshold;
  }

  get warningConfirmationItems() {
    if (!this.shouldConfirm) {
      return [];
    }

    return [{ label: this.locale.get("confirmation_safeBccThresholdCheckboxLabel", { threshold: this.threshold }) }];
  }
}
