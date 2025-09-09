/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

export class UnsafeBodiesConfirmation {
  constructor(language) {
    this.language = language;
    this.needToConfirm = false;
    this.initialized = false;
    this.confirmationMessages = [];
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
    const bodyText = originalBodyText.split("\n").map(line => { return line.trim(); }).join();
    if (!bodyText) {
      return;
    }
    
    // config object:
    // {
    //   "name1" : {
    //     message: "sample message: $1"
    //     patterns: [ "test",
    //                 "test2" ],
    //   }
    // }
    for (const config of Object.values(unsafeBodies)) {
      const configLang = config.lang;
      if (!this.isTargetLanguage(configLang)) {
        continue;
      }
      const matcher = UnsafeBodiesConfirmation.generateMatcher(config.patterns);
      if (matcher.test(bodyText)) {
        this.confirmationMessages.push(config.message);
      }
    }
    this.needToConfirm = this.confirmationMessages.length >= 1;
  }

  // generateReconfirmationContentElement() {
  //   const strongElement = document.createElement("strong");
  //   strongElement.textContent =
  //     this.itemType === Office.MailboxEnums.ItemType.Message
  //       ? this.locale.get("Reconfirmation_safeBccReconfirmationThresholdWarning", {
  //           threshold: this.reconfirmationThreshold,
  //         })
  //       : this.locale.get("Reconfirmation_safeBccReconfirmationThresholdAttendeesWarning", {
  //           threshold: this.reconfirmationThreshold,
  //         });
  //   const messageAfterElement = document.createElement("p");
  //   messageAfterElement.textContent = this.locale.get("Reconfirmation_confirmToSend");
  //   const contentElement = document.createElement("div");
  //   const messageBodyElement = document.createElement("p");
  //   messageBodyElement.appendChild(strongElement);
  //   contentElement.appendChild(messageBodyElement);
  //   contentElement.appendChild(messageAfterElement);
  //   return contentElement;
  // }

  get warningConfirmationItems() {
    return this.confirmationMessages;
  }
}
