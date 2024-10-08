import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

export class AttachmentsConfirmation {
  unsafeAttachments = new Set();
  attachments = new Set();

  init(data) {
    const attachments = data.target.attachments || [];
    const unsafeFiles = data.config.unsafeFiles || [];
    const unsafeAttachmentMatcher =
      unsafeFiles.length > 0
        ? new RegExp(unsafeFiles.map((pattern) => wildcardToRegexp(pattern)).join("|"), "i")
        : null;
    for (const attachment of attachments) {
      if (unsafeAttachmentMatcher && unsafeAttachmentMatcher.test(attachment.name)) {
        this.unsafeAttachments.add(attachment);
      }
      this.attachments.add(attachment);
    }
  }
}
