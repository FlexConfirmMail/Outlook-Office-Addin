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

  generateMatchers(patterns) {
    const uniquePatterns = new Set(
      (patterns || [])
        .filter((pattern) => !pattern.startsWith("#")) // reject commented out items
        .map(
          (pattern) => pattern.toLowerCase().replace(/^(-?)@/, "$1") // delete needless "@" from domain only patterns: "@example.com" => "example.com"
        )
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
    for (const pattern of uniquePatterns) {
      if (pattern.includes("@")) {
        fullPatterns.add(pattern);
      } else {
        domainPatterns.add(pattern);
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
    };
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

        if (this.$blockPatternsMatchers.domain.test(classifiedRecipient.domain)) {
          blockWithDomain.add(classifiedRecipient);
        } else if (this.$blockPatternsMatchers.full.test(classifiedRecipient.address)) {
          block.add(classifiedRecipient);
        }

        if (this.$rewarningPatternsMatchers.domain.test(classifiedRecipient.domain)) {
          rewarningWithDomain.add(classifiedRecipient);
        } else if (this.$rewarningPatternsMatchers.full.test(classifiedRecipient.address)) {
          rewarning.add(classifiedRecipient);
        }

        if (
          classifiedRecipient.recipientType ===
            Office.MailboxEnums.RecipientType.DistributionList &&
          (!classifiedRecipient.address || classifiedRecipient.address === "") &&
          (!classifiedRecipient.domain || classifiedRecipient.domain === "")
        ) {
          distributionLists.add(classifiedRecipient);
        }

        if (this.commonConfig?.UntrustUnsafeRecipients) {
          for (const recipient of [
            ...unsafeWithDomain,
            ...unsafe,
            ...distributionLists,
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
