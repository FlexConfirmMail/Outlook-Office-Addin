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
    this.$unsafePatternsMatchers = this.generateMatchers(unsafeDomains);
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
      [...uniquePatterns].filter((pattern) => pattern.startsWith("-")).map((pattern) => pattern.replace(/^-/, ""))
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
      domain: new RegExp(`^(${Array.from(domainPatterns, (pattern) => wildcardToRegexp(pattern)).join("|")})$`, "i"),
      full: new RegExp(`^(${Array.from(fullPatterns, (pattern) => wildcardToRegexp(pattern)).join("|")})$`, "i"),
    };
  }

  classify(recipients) {
    const trusted = new Set();
    const untrusted = new Set();
    const unsafeWithDomain = new Set();
    const unsafe = new Set();

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
    }

    return {
      trusted: Array.from(trusted),
      untrusted: Array.from(untrusted),
      unsafeWithDomain: Array.from(unsafeWithDomain),
      unsafe: Array.from(unsafe),
    };
  }

  static classifyAll({ to, cc, bcc, trustedDomains, unsafeDomains }) {
    const classifier = new RecipientClassifier({
      trustedDomains: trustedDomains || [],
      unsafeDomains: unsafeDomains || [],
    });
    const classifiedTo = classifier.classify(to);
    const classifiedCc = classifier.classify(cc);
    const classifiedBcc = classifier.classify(bcc);

    return {
      trusted: [
        ...new Set([
          ...classifiedTo.trusted.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.trusted.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.trusted.map((recipient) => ({ ...recipient, type: "Bcc" })),
        ]),
      ],
      untrusted: [
        ...new Set([
          ...classifiedTo.untrusted.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.untrusted.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.untrusted.map((recipient) => ({ ...recipient, type: "Bcc" })),
        ]),
      ],
      unsafeWithDomain: [
        ...new Set([
          ...classifiedTo.unsafeWithDomain.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.unsafeWithDomain.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.unsafeWithDomain.map((recipient) => ({ ...recipient, type: "Bcc" })),
        ]),
      ],
      unsafe: [
        ...new Set([
          ...classifiedTo.unsafe.map((recipient) => ({ ...recipient, type: "To" })),
          ...classifiedCc.unsafe.map((recipient) => ({ ...recipient, type: "Cc" })),
          ...classifiedBcc.unsafe.map((recipient) => ({ ...recipient, type: "Bcc" })),
        ]),
      ],
    };
  }
}
