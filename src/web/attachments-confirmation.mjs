import { L10n } from "./l10n.mjs";
import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

export class AttachmentsConfirmation {
  locale = null;

  constructor(language) {
    this.locale = L10n.get(language);
    this.ready = this.locale.ready;
    this.clear();
  }

  clear() {
    this.unsafeAttachments = new Set();
    this.attachments = new Set();
  }

  init(data) {
    this.clear();
    const attachments = data.target.attachments || [];
    const unsafeFiles = data.config.unsafeFiles || [];

    const uniquePatterns = new Set(
      (unsafeFiles || []).filter((pattern) => !pattern.startsWith("#")) // reject commented out items
    );
    const negativeItems = new Set(
      [...uniquePatterns].filter((pattern) => pattern.startsWith("-")).map((pattern) => pattern.replace(/^-/, ""))
    );
    for (const negativeItem of negativeItems) {
      uniquePatterns.delete(negativeItem);
      uniquePatterns.delete(`-${negativeItem}`);
    }
    const unsafeAttachmentMatcher =
      unsafeFiles.length > 0
        ? new RegExp(Array.from(uniquePatterns, (pattern) => wildcardToRegexp(pattern)).join("|"), "i")
        : null;

    for (const attachment of attachments) {
      if (unsafeAttachmentMatcher && unsafeAttachmentMatcher.test(attachment.name)) {
        this.unsafeAttachments.add(attachment);
      }
      this.attachments.add(attachment);
    }
  }

  get warningConfirmationItems() {
    return Array.from(this.unsafeAttachments, (attachment) => ({
      label: this.locale.get("confirmation_unsafeAttachmentCheckboxLabel", { name: attachment.name }),
    }));
  }

  get confirmationItems() {
    return Array.from(this.attachments, (attachment) => ({
      label: this.locale.get("confirmation_attachmentCheckboxLabel", { name: attachment.name }),
    }));
  }
}
