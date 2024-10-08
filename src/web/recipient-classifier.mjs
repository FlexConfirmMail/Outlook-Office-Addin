/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
"use strict";

import * as RecipientParser from "./recipient-parser.mjs";
import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

export class RecipientClassifier {
  constructor({ trustedDomains } = {}) {
    this.$trustedPatternsMatcher = this.generateMatcher(trustedDomains);
    this.classify = this.classify.bind(this);
  }

  generateMatcher(patterns) {
    const uniquePatterns = new Set(
      (patterns || [])
        .filter((pattern) => !pattern.startsWith("#")) // reject commented out items
        .map(
          (pattern) =>
            pattern
              .toLowerCase()
              .replace(/^(-?)@/, "$1") // delete needless "@" from domain only patterns: "@example.com" => "example.com"
              .replace(/^(-?)(?![^@]+@)/, "$1*@") // normalize to full address patterns: "foo@example.com" => "foo@example.com", "example.com" => "*@example.com"
        )
    );
    const negativeItems = new Set(
      [...uniquePatterns].filter((pattern) => pattern.startsWith("-")).map((pattern) => pattern.replace(/^-/, ""))
    );
    for (const negativeItem of negativeItems) {
      uniquePatterns.delete(negativeItem);
      uniquePatterns.delete(`-${negativeItem}`);
    }
    return new RegExp(
      `^(${[...uniquePatterns].map((pattern) => wildcardToRegexp(pattern)).join("|")})$`,
      "i"
    );
  }

  classify(recipients) {
    const trusted = new Set();
    const untrusted = new Set();

    for (const recipient of recipients) {
      const classifiedRecipient = {
        ...RecipientParser.parse(recipient),
      };
      const address = classifiedRecipient.address;
      if (this.$trustedPatternsMatcher.test(address)) {
        trusted.add(classifiedRecipient);
      }
      else {
        untrusted.add(classifiedRecipient);
      }
    }

    return {
      trusted: Array.from(trusted),
      untrusted: Array.from(untrusted),
    };
  }
}
