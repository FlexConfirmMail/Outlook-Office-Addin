/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
"use strict";

import * as RecipientParser from "./recipient-parser.mjs";
import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

export class RecipientClassifier {
  constructor({ trustedDomains, unsafeDomains, commonConfig } = {}) {
    this.$trustedPatternsMatchers = this.generateMatchers(trustedDomains);
    this.$unsafePatternsMatchers = this.generateMatchers(unsafeDomains?.["WARNING"] || []);
    this.$blockPatternsMatchers = this.generateMatchers(unsafeDomains?.["BLOCK"] || []);
    this.$rewarningPatternsMatchers = this.generateMatchers(unsafeDomains?.["REWARNING"] || []);
    this.classify = this.classify.bind(this);
    this.commonConfig = commonConfig;
  }

  // Split a line of the unsafe domains config to the pattern and its optional message.
  //   "example.com = message" => { pattern: "example.com", message: "message" }
  //   "example.com"           => { pattern: "example.com", message: "" }
  // "=" in the pattern must be escaped as "\=".
  //   "a\=b@example.com = message" => { pattern: "a=b@example.com", message: "message" }
  static parsePatternLine(line) {
    // A backslash is always consumed with the next character, so an escaped "=" never becomes the separator.
    const match = line.match(/^((?:\\.|[^=\\])*)=(.*)$/);
    if (!match) {
      return { pattern: RecipientClassifier.unescapePattern(line).trim(), message: "" };
    }
    return {
      pattern: RecipientClassifier.unescapePattern(match[1]).trim(),
      message: match[2].trim(),
    };
  }

  static unescapePattern(pattern) {
    return pattern.replace(/\\=/g, "=");
  }

  generateMatchers(patterns) {
    const messages = new Map();
    const uniquePatterns = new Set(
      (patterns || [])
        .filter((line) => !line.startsWith("#")) // reject commented out items
        .map((line) => {
          const parsed = RecipientClassifier.parsePatternLine(line);
          const pattern = parsed.pattern.toLowerCase().replace(/^(-?)@/, "$1"); // delete needless "@" from domain only patterns: "@example.com" => "example.com"
          if (parsed.message && !messages.has(pattern)) {
            messages.set(pattern, parsed.message);
          }
          return pattern;
        })
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

    const domainPatterns = new Set();
    const fullPatterns = new Set();
    const domainMessages = [];
    const fullMessages = [];
    for (const pattern of uniquePatterns) {
      let targetPatterns = domainPatterns;
      let targetMessages = domainMessages;
      if (pattern.includes("@")) {
        targetPatterns = fullPatterns;
        targetMessages = fullMessages;
      }
      targetPatterns.add(pattern);
      if (messages.has(pattern)) {
        targetMessages.push({
          matcher: new RegExp(`^(${wildcardToRegexp(pattern)})$`, "i"),
          message: messages.get(pattern),
        });
      }
    }
    return {
      domain: this.patternsToMatcher(domainPatterns),
      full: this.patternsToMatcher(fullPatterns),
      domainMessages,
      fullMessages,
    };
  }

  // Find the message of the first matched pattern.
  // The message for the address takes precedence over the one for the domain.
  findMessage(matchers, { address, domain }) {
    return (
      matchers.fullMessages.find(({ matcher }) => matcher.test(address)) ||
      matchers.domainMessages.find(({ matcher }) => matcher.test(domain))
    )?.message;
  }

  // Set the custom message to the recipient only when it is specified,
  // to keep the classified result same as before for configs without messages.
  setMessage(classifiedRecipient, propertyName, matchers) {
    const message = this.findMessage(matchers, classifiedRecipient);
    if (message) {
      classifiedRecipient[propertyName] = message;
    }
  }

  patternsToMatcher(patterns) {
    // An empty pattern set must never match to anything, and "(?!)" is used for it.
    // Note that "^()$" cannot be used instead, because it matches an empty domain
    // and address, which is a valid pattern meaning "no domain" (specified as "@").
    // "(?!)" also must not be put into the pattern set, because wildcardToRegexp()
    // converts its "?" to "." as a wildcard and it becomes "\(.!\)", which matches
    // to 4 letters strings like "(a!)" instead of nothing.
    const source =
      patterns.size > 0
        ? Array.from(patterns, (pattern) => wildcardToRegexp(pattern)).join("|")
        : "(?!)";
    return new RegExp(`^(${source})$`, "i");
  }


  classify(recipients) {
    const trusted = new Set();
    const untrusted = new Set();
    const unsafeWithDomain = new Set();
    const unsafe = new Set();
    const distributionLists = new Set();
    const blockWithDomain = new Set();
    const block = new Set();
    const rewarningWithDomain = new Set();
    const rewarning = new Set();

    if (recipients) {
      for (const recipient of recipients) {
        const classifiedRecipient = {
          ...RecipientParser.parse(recipient),
        };

        if (
          this.$trustedPatternsMatchers.domain.test(classifiedRecipient.domain) ||
          this.$trustedPatternsMatchers.full.test(classifiedRecipient.address)
        ) {
          trusted.add(classifiedRecipient);
        } else {
          untrusted.add(classifiedRecipient);
        }

        if (this.$unsafePatternsMatchers.domain.test(classifiedRecipient.domain)) {
          unsafeWithDomain.add(classifiedRecipient);
        } else if (this.$unsafePatternsMatchers.full.test(classifiedRecipient.address)) {
          unsafe.add(classifiedRecipient);
        }
        this.setMessage(classifiedRecipient, "unsafeMessage", this.$unsafePatternsMatchers);

        if (this.$blockPatternsMatchers.domain.test(classifiedRecipient.domain)) {
          blockWithDomain.add(classifiedRecipient);
        } else if (this.$blockPatternsMatchers.full.test(classifiedRecipient.address)) {
          block.add(classifiedRecipient);
        }
        this.setMessage(classifiedRecipient, "blockMessage", this.$blockPatternsMatchers);

        if (this.$rewarningPatternsMatchers.domain.test(classifiedRecipient.domain)) {
          rewarningWithDomain.add(classifiedRecipient);
        } else if (this.$rewarningPatternsMatchers.full.test(classifiedRecipient.address)) {
          rewarning.add(classifiedRecipient);
        }
        this.setMessage(classifiedRecipient, "rewarningMessage", this.$rewarningPatternsMatchers);

        if (
          classifiedRecipient.recipientType ===
            Office.MailboxEnums.RecipientType.DistributionList &&
          (!classifiedRecipient.address || classifiedRecipient.address === "") &&
          (!classifiedRecipient.domain || classifiedRecipient.domain === "")
        ) {
          distributionLists.add(classifiedRecipient);
        }
      }
      if (this.commonConfig?.UntrustUnsafeRecipients) {
        for (const recipient of [
          ...unsafeWithDomain,
          ...unsafe,
          ...blockWithDomain,
          ...block,
          ...rewarningWithDomain,
          ...rewarning,
        ]) {
          trusted.delete(recipient);
          untrusted.add(recipient);
        }
      }
    }
    return {
      trusted: Array.from(trusted),
      untrusted: Array.from(untrusted),
      unsafeWithDomain: Array.from(unsafeWithDomain),
      unsafe: Array.from(unsafe),
      distributionLists: Array.from(distributionLists),
      blockWithDomain: Array.from(blockWithDomain),
      block: Array.from(block),
      rewarningWithDomain: Array.from(rewarningWithDomain),
      rewarning: Array.from(rewarning),
    };
  }

  static classifyAll({
    locale,
    to,
    cc,
    bcc,
    requiredAttendees,
    optionalAttendees,
    trustedDomains,
    unsafeDomains,
    commonConfig,
  }) {
    const classifier = new RecipientClassifier({
      trustedDomains: trustedDomains || [],
      unsafeDomains: unsafeDomains || [],
      commonConfig: commonConfig || {},
    });
    const classifiedTo = classifier.classify(to);
    const classifiedCc = classifier.classify(cc);
    const classifiedBcc = classifier.classify(bcc);
    const classifiedRequiredAttendee = classifier.classify(requiredAttendees);
    const classifiedOptionalAttendee = classifier.classify(optionalAttendees);

    return {
      trusted: [
        ...new Set([
          ...classifiedTo.trusted.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.trusted.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.trusted.map((recipient) => ({ ...recipient, type: "Bcc" })),
          ...classifiedRequiredAttendee.trusted.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_requiredAttendee"),
          })),
          ...classifiedOptionalAttendee.trusted.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_optionalAttendee"),
          })),
        ]),
      ],
      untrusted: [
        ...new Set([
          ...classifiedTo.untrusted.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.untrusted.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.untrusted.map((recipient) => ({ ...recipient, type: "Bcc" })),
          ...classifiedRequiredAttendee.untrusted.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_requiredAttendee"),
          })),
          ...classifiedOptionalAttendee.untrusted.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_optionalAttendee"),
          })),
        ]),
      ],
      unsafeWithDomain: [
        ...new Set([
          ...classifiedTo.unsafeWithDomain.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.unsafeWithDomain.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.unsafeWithDomain.map((recipient) => ({ ...recipient, type: "Bcc" })),
          ...classifiedRequiredAttendee.unsafeWithDomain.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_requiredAttendee"),
          })),
          ...classifiedOptionalAttendee.unsafeWithDomain.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_optionalAttendee"),
          })),
        ]),
      ],
      unsafe: [
        ...new Set([
          ...classifiedTo.unsafe.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.unsafe.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.unsafe.map((recipient) => ({ ...recipient, type: "Bcc" })),
          ...classifiedRequiredAttendee.unsafe.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_requiredAttendee"),
          })),
          ...classifiedOptionalAttendee.unsafe.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_optionalAttendee"),
          })),
        ]),
      ],
      blockWithDomain: [
        ...new Set([
          ...classifiedTo.blockWithDomain.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.blockWithDomain.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.blockWithDomain.map((recipient) => ({ ...recipient, type: "Bcc" })),
          ...classifiedRequiredAttendee.blockWithDomain.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_requiredAttendee"),
          })),
          ...classifiedOptionalAttendee.blockWithDomain.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_optionalAttendee"),
          })),
        ]),
      ],
      block: [
        ...new Set([
          ...classifiedTo.block.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.block.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.block.map((recipient) => ({ ...recipient, type: "Bcc" })),
          ...classifiedRequiredAttendee.block.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_requiredAttendee"),
          })),
          ...classifiedOptionalAttendee.block.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_optionalAttendee"),
          })),
        ]),
      ],
      distributionLists: [
        ...new Set([
          ...classifiedTo.distributionLists.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.distributionLists.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.distributionLists.map((recipient) => ({ ...recipient, type: "Bcc" })),
          ...classifiedRequiredAttendee.distributionLists.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_requiredAttendee"),
          })),
          ...classifiedOptionalAttendee.distributionLists.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_optionalAttendee"),
          })),
        ]),
      ],
      rewarningWithDomain: [
        ...new Set([
          ...classifiedTo.rewarningWithDomain.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.rewarningWithDomain.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.rewarningWithDomain.map((recipient) => ({ ...recipient, type: "Bcc" })),
          ...classifiedRequiredAttendee.rewarningWithDomain.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_requiredAttendee"),
          })),
          ...classifiedOptionalAttendee.rewarningWithDomain.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_optionalAttendee"),
          })),
        ]),
      ],
      rewarning: [
        ...new Set([
          ...classifiedTo.rewarning.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.rewarning.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.rewarning.map((recipient) => ({ ...recipient, type: "Bcc" })),
          ...classifiedRequiredAttendee.rewarning.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_requiredAttendee"),
          })),
          ...classifiedOptionalAttendee.rewarning.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_optionalAttendee"),
          })),
        ]),
      ],
    };
  }
}
