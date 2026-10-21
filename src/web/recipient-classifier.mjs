/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
"use strict";

import * as RecipientParser from "./recipient-parser.mjs";
import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

// Categories of the classified result. classifyAll() returns the categories
// in this order.
const CLASSIFIED_CATEGORIES = [
  "trusted",
  "untrusted",
  "unsafeWithDomain",
  "unsafe",
  "blockWithDomain",
  "block",
  "distributionLists",
  "rewarningWithDomain",
  "rewarning",
];

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

    const domainPatterns = new Set("(?!)");
    const fullPatterns = new Set("(?!)");
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
      domain: new RegExp(
        `^(${Array.from(domainPatterns, (pattern) => wildcardToRegexp(pattern)).join("|")})$`,
        "i"
      ),
      full: new RegExp(
        `^(${Array.from(fullPatterns, (pattern) => wildcardToRegexp(pattern)).join("|")})$`,
        "i"
      ),
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
    // The type of an attendee must be resolved lazily, because "locale" is not
    // always given: a message has no attendee and does not require it.
    const slots = [
      { recipients: to, getType: () => "To" },
      { recipients: cc, getType: () => "Cc" },
      { recipients: bcc, getType: () => "Bcc" },
      {
        recipients: requiredAttendees,
        getType: () => locale.get("confirmation_requiredAttendee"),
      },
      {
        recipients: optionalAttendees,
        getType: () => locale.get("confirmation_optionalAttendee"),
      },
    ];
    const classifiedSlots = slots.map(({ recipients, getType }) => ({
      classified: classifier.classify(recipients),
      getType,
    }));
    const classifiedAll = {};
    for (const category of CLASSIFIED_CATEGORIES) {
      classifiedAll[category] = classifiedSlots.flatMap(({ classified, getType }) =>
        classified[category].map((recipient) => ({ ...recipient, type: getType() }))
      );
    }
    return classifiedAll;
  }
}
