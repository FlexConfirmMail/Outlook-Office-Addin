/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
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
    this.prohibitedAttachments = new Set();
    this.unsafeAttachments = new Set();
    this.attachments = new Set();
  }

  generateMatcher(patterns) {
    const uniquePatterns = new Set(
      (patterns || []).filter((pattern) => !pattern.startsWith("#")) // reject commented out items
    );
    const negativeItems = new Set(
      [...uniquePatterns]
        .filter((pattern) => pattern.startsWith("-"))
        .map((pattern) => pattern.replace(/^-/, ""))
    );
    for (const negativeItem of negativeItems) {
      uniquePatterns.delete(negativeItem);
      uniquePatterns.delete(`-${negativeItem}`);
    }
    const matcher =
      patterns.length > 0
        ? new RegExp(
            Array.from(uniquePatterns, (pattern) => wildcardToRegexp(pattern)).join("|"),
            "i"
          )
        : null;
    return matcher;
  }

  init(data) {
    this.clear();
    const attachments = data.target.attachments || [];
    const unsafeFiles = data.config.unsafeFiles || {};
    const warningFiles = unsafeFiles?.["WARNING"] || [];
    const prohibitedFiles = unsafeFiles?.["PROHIBITED"] || [];
    const warningAttachmentMatcher = this.generateMatcher(warningFiles);
    const prohibitedAttachmentMatcher = this.generateMatcher(prohibitedFiles);

    for (const attachment of attachments) {
      if (warningAttachmentMatcher && warningAttachmentMatcher.test(attachment.name)) {
        this.unsafeAttachments.add(attachment);
      }
      if (prohibitedAttachmentMatcher && prohibitedAttachmentMatcher.test(attachment.name)) {
        this.prohibitedAttachments.add(attachment);
      }
      this.attachments.add(attachment);
    }
  }

  get warningConfirmationItems() {
    return Array.from(this.unsafeAttachments, (attachment) => ({
      label: this.locale.get("confirmation_unsafeAttachmentCheckboxLabel", {
        name: attachment.name,
      }),
    }));
  }

  get confirmationItems() {
    return Array.from(this.attachments, (attachment) => ({
      label: this.locale.get("confirmation_attachmentCheckboxLabel", { name: attachment.name }),
    }));
  }
}
