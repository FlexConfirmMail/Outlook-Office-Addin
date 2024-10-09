export class SafeBccConfirmation {
  shouldConfirm = false;
  threshold = 0;

  init(data) {
    if (!data.config.common.SafeBccEnabled) {
      return;
    }

    this.threshold = data.config.common.SafeBccThreshold;
    if (this.threshold < 1) {
      return;
    }

    const recipients = [...data.target.to, ...data.target.cc, ...data.target.bcc];
    const domains = new Set(recipients.map((recipient) => recipient.domain));
    this.shouldConfirm = domains.size >= this.threshold;
  }

  get warningConfirmationItems() {
    if (!this.shouldConfirm) {
      return [];
    }

    return [{ label: `[警告] To・Ccに${this.threshold}件以上のドメインが含まれています。` }];
  }
}
