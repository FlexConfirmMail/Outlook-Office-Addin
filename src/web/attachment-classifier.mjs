/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { parsePatternLine } from "./unsafe-pattern.mjs";
import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

export class AttachmentClassifier {
  static generateMatchers(patterns) {
    const messages = new Map();
    const uniquePatterns = new Set(
      (patterns || [])
        .filter((line) => !line.startsWith("#")) // reject commented out items
        .map((line) => {
          const parsed = parsePatternLine(line);
          if (parsed.message && !messages.has(parsed.pattern)) {
            messages.set(parsed.pattern, parsed.message);
          }
          return parsed.pattern;
        })
        .filter((pattern) => pattern !== "") // reject patterns matching to anything
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
      uniquePatterns.size > 0
        ? new RegExp(
            Array.from(uniquePatterns, (pattern) => wildcardToRegexp(pattern)).join("|"),
            "i"
          )
        : null;
    const patternMessages = [];
    for (const pattern of uniquePatterns) {
      if (messages.has(pattern)) {
        patternMessages.push({
          matcher: new RegExp(wildcardToRegexp(pattern), "i"),
          message: messages.get(pattern),
        });
      }
    }
    return { matcher, messages: patternMessages };
  }

  // Find the message of the first matched pattern.
  static findMessage(matchers, name) {
    return matchers.messages.find(({ matcher }) => matcher.test(name))?.message;
  }

  // Set the custom message to the attachment only when it is specified,
  // to keep the classified result same as before for configs without messages.
  static setMessage(attachment, propertyName, matchers) {
    const message = this.findMessage(matchers, attachment.name);
    if (message) {
      attachment[propertyName] = message;
    }
  }

  static classify(data) {
    const unsafe = new Set();
    const block = new Set();
    const rewarning = new Set();
    const attachments = data.target.attachments || [];
    const unsafeFilesConfig = data.config.unsafeFiles || {};
    const warningFilesConfig = unsafeFilesConfig?.["WARNING"] || [];
    const blockFilesConfig = unsafeFilesConfig?.["BLOCK"] || [];
    const rewarningFilesConfig = unsafeFilesConfig?.["REWARNING"] || [];
    const warningAttachmentMatchers = this.generateMatchers(warningFilesConfig);
    const blockAttachmentMatchers = this.generateMatchers(blockFilesConfig);
    const rewarningAttachmentMatchers = this.generateMatchers(rewarningFilesConfig);

    const trusted = new Set(attachments);
    for (const attachment of attachments) {
      if (warningAttachmentMatchers.matcher?.test(attachment.name)) {
        unsafe.add(attachment);
        trusted.delete(attachment);
        this.setMessage(attachment, "unsafeMessage", warningAttachmentMatchers);
      }
      if (blockAttachmentMatchers.matcher?.test(attachment.name)) {
        block.add(attachment);
        trusted.delete(attachment);
        this.setMessage(attachment, "blockMessage", blockAttachmentMatchers);
      }
      if (rewarningAttachmentMatchers.matcher?.test(attachment.name)) {
        rewarning.add(attachment);
        trusted.delete(attachment);
        this.setMessage(attachment, "rewarningMessage", rewarningAttachmentMatchers);
      }
    }
    return {
      trusted: Array.from(trusted),
      unsafe: Array.from(unsafe),
      block: Array.from(block),
      rewarning: Array.from(rewarning),
    };
  }
}
