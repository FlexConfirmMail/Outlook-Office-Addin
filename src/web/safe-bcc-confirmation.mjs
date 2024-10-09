export class SafeBccConfirmation {
  shouldContirm = false;
  domainsCount = 0;

  init(data) {
    if (!data.config.common.SafeBccEnabled) {
      return;
    }

    const threshold = data.config.common.SafeBccThreshold;
    if (threshold < 1) {
      return;
    }

    const recipients = [...data.target.to, ...data.target.cc, ...data.target.bcc];
    const domains = new Set(recipients.map((recipient) => recipient.domain));
    this.domainsCount = domains.size;
    this.shouldContirm = this.domainsCount >= threshold;
  }

  get warningConfirmationItems() {
    if (!this.shouldContirm) {
      return [];
    }

    return [{ label: `[警告] To・Ccに${this.domainsCount}件以上のドメインが含まれています。` }];
  }
}
