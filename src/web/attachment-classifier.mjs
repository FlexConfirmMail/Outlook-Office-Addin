/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

export class AttachmentClassifier {
  static generateMatcher(patterns) {
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

  static classify(data) {
    const unsafe = new Set();
    const block = new Set();
    const attachments = data.target.attachments || [];
    const unsafeFilesConfig = data.config.unsafeFiles || {};
    const warningFilesConfig = unsafeFilesConfig?.["WARNING"] || [];
    const blockFilesConfig = unsafeFilesConfig?.["BLOCK"] || [];
    const warningAttachmentMatcher = this.generateMatcher(warningFilesConfig);
    const blockAttachmentMatcher = this.generateMatcher(blockFilesConfig);

    const trusted = new Set(attachments);
    for (const attachment of attachments) {
      if (warningAttachmentMatcher && warningAttachmentMatcher.test(attachment.name)) {
        unsafe.add(attachment);
        trusted.delete(attachment);
      }
      if (blockAttachmentMatcher && blockAttachmentMatcher.test(attachment.name)) {
        block.add(attachment);
        trusted.delete(attachment);
      }
    }
    return {
      trusted: Array.from(trusted),
      unsafe: Array.from(unsafe),
      block: Array.from(block),
    };
  }
}
