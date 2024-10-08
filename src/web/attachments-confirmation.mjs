import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

export class AttachmentsConfirmation {
  static unsafeAttachments = new Set();
  static attachments = new Set();

  static init(data) {
    const attachments = data.target.attachments || [];
    const unsafeFiles = data.config.unsafeFiles || [];
    const unsafeAttachmentMatcher = new RegExp(unsafeFiles.map((pattern) => wildcardToRegexp(pattern)).join("|"));
    for (const attachment of attachments) {
      if (unsafeAttachmentMatcher.test(attachment.name))
        this.unsafeAttachments.add(attachment);
      this.attachments.add(attachment);
    }
  }
}
