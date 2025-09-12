/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";
import { L10n } from "./l10n.mjs";

export class UnsafeBodiesConfirmation {
  constructor(language) {
    this.language = language;
    this.needToConfirm = false;
    this.needToReconfirm = false;
    this.initialized = false;
    this.confirmationMessages = [];
    this.reconfirmationMessages = [];
    this.locale = L10n.get(language);
    this.ready = this.locale.ready;
  }

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

  isTargetLanguage(valueLang) {
    if (!valueLang) {
      // No value lang means "for all language".
      return true;
    }
    return this.language == valueLang || this.language.split("-")[0] == valueLang;
  }

  init(data) {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    const unsafeBodies = data.config.unsafeBodies;
    if (!unsafeBodies) {
      return;
    }
    if (unsafeBodies == {}) {
      return;
    }

    const originalBodyText = data.target.bodyText;
    if (!originalBodyText) {
      return;
    }
    const bodyText = originalBodyText
      .split("\n")
      .map((line) => {
        // If we delete blank lines, paragraphs will be joined together,
        // and that may cause mis-matching, so leave blank lines as they are.
        return line.trim() || "\n";
      })
      .join("");
    if (!bodyText) {
      return;
    }

    // config object:
    // {
    //   "name1" : {
    //     Message: "sample message"
    //     Keywords: [ "test",
    //                 "test2" ],
    //   }
    // }
    for (const config of Object.values(unsafeBodies)) {
      const configLang = config.lang;
      if (!this.isTargetLanguage(configLang)) {
        continue;
      }
      const matcher = UnsafeBodiesConfirmation.generateMatcher(config.Keywords);
      if (matcher.test(bodyText)) {
        const warningType = config.WarningType?.toUpperCase();
        switch (warningType) {
          case "WARNING":
          default:
            this.confirmationMessages.push(config.Message);
            break;
          case "REWARNING":
            this.reconfirmationMessages.push(config.Message);
            break;
        }
      }
    }
    this.needToConfirm = this.confirmationMessages.length >= 1;
    this.needToReconfirm = this.reconfirmationMessages.length >= 1;
  }

  generateReconfirmationContentElements() {
    const contentElements = [];
    for (const message of this.reconfirmationMessages) {
      const strongElement = document.createElement("strong");
      strongElement.textContent = message;
      const messageAfterElement = document.createElement("p");
      messageAfterElement.textContent = this.locale.get("Reconfirmation_confirmToSend");
      const contentElement = document.createElement("div");
      const messageBodyElement = document.createElement("pre");
      messageBodyElement.appendChild(strongElement);
      contentElement.appendChild(messageBodyElement);
      contentElement.appendChild(messageAfterElement);
      contentElements.push(contentElement);
    }
    return contentElements;
  }

  get warningConfirmationItems() {
    return this.confirmationMessages;
  }
}
