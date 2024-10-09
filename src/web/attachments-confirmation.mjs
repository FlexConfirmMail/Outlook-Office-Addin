import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

export class AttachmentsConfirmation {
  unsafeAttachments = new Set();
  attachments = new Set();

  init(data) {
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
}
