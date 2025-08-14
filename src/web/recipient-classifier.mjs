/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
"use strict";

import * as RecipientParser from "./recipient-parser.mjs";
import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

export class RecipientClassifier {
  constructor({ trustedDomains, unsafeDomains } = {}) {
    this.$trustedPatternsMatchers = this.generateMatchers(trustedDomains);
    this.$unsafePatternsMatchers = this.generateMatchers(unsafeDomains["WARNING"] || []);
    this.$forbiddenPatternsMatchers = this.generateMatchers(unsafeDomains["PROHIBITED"] || []);
    this.classify = this.classify.bind(this);
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

    const domainPatterns = new Set();
    const fullPatterns = new Set();
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
    const prohibitedWithDomain = new Set();
    const prohibited = new Set();

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

        if (this.$forbiddenPatternsMatchers.domain.test(classifiedRecipient.domain)) {
          prohibitedWithDomain.add(classifiedRecipient);
        } else if (this.$forbiddenPatternsMatchers.full.test(classifiedRecipient.address)) {
          prohibited.add(classifiedRecipient);
        }
      }
    }
    return {
      trusted: Array.from(trusted),
      untrusted: Array.from(untrusted),
      unsafeWithDomain: Array.from(unsafeWithDomain),
      unsafe: Array.from(unsafe),
      prohibitedWithDomain: Array.from(prohibitedWithDomain),
      prohibited: Array.from(prohibited),
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
  }) {
    const classifier = new RecipientClassifier({
      trustedDomains: trustedDomains || [],
      unsafeDomains: unsafeDomains || [],
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
      prohibitedWithDomain: [
        ...new Set([
          ...classifiedTo.prohibitedWithDomain.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.prohibitedWithDomain.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.prohibitedWithDomain.map((recipient) => ({ ...recipient, type: "Bcc" })),
          ...classifiedRequiredAttendee.prohibitedWithDomain.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_requiredAttendee"),
          })),
          ...classifiedOptionalAttendee.prohibitedWithDomain.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_optionalAttendee"),
          })),
        ]),
      ],
      prohibited: [
        ...new Set([
          ...classifiedTo.prohibited.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.prohibited.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.prohibited.map((recipient) => ({ ...recipient, type: "Bcc" })),
          ...classifiedRequiredAttendee.prohibited.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_requiredAttendee"),
          })),
          ...classifiedOptionalAttendee.prohibited.map((recipient) => ({
            ...recipient,
            type: locale.get("confirmation_optionalAttendee"),
          })),
        ]),
      ],
    };
  }
}
