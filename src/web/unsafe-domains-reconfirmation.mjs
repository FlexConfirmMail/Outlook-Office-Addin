/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { L10n } from "./l10n.mjs";

export class UnsafeDomainsReconfirmation {
  needToReconfirm = false;
  rewarningDomains = new Set();
  // Domains with custom messages: Map of message => Set of domains.
  rewarningDomainsByMessage = new Map();
  initialized = false;
  locale = "jp";
  ready = null;
  itemType = Office.MailboxEnums.ItemType.Message;

  constructor(language) {
    this.locale = L10n.get(language);
    this.ready = this.locale.ready;
  }

  init(data) {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    for (const recipient of data.classified.recipients.rewarningWithDomain) {
      let target = recipient.domain;
      if (!target || target === "") {
        target = recipient.displayName;
      }
      if (!target || target === "") {
        target = "Unknown";
      }
      if (!recipient.rewarningMessage) {
        this.rewarningDomains.add(target);
        continue;
      }
      // The custom message can be a message ID defined in locales or custom-locales.
      // If it is not a message ID, L10n returns it with placeholders replaced.
      const message = this.locale.get(recipient.rewarningMessage, {
        domain: recipient.domain.toLowerCase(),
        address: recipient.address,
      });
      if (!this.rewarningDomainsByMessage.has(message)) {
        this.rewarningDomainsByMessage.set(message, new Set());
      }
      this.rewarningDomainsByMessage.get(message).add(target);
    }
    this.needToReconfirm =
      this.rewarningDomains.size > 0 || this.rewarningDomainsByMessage.size > 0;
  }

  generateReconfirmationContentElements() {
    const contentElements = [];
    if (this.rewarningDomains.size > 0) {
      contentElements.push(
        this.generateContentElement(
          this.locale.get("Reconfirmation_unsafeDomains"),
          this.rewarningDomains
        )
      );
    }
    for (const [message, domains] of this.rewarningDomainsByMessage) {
      contentElements.push(this.generateContentElement(message, domains));
    }
    return contentElements;
  }

  generateContentElement(messageBefore, domains) {
    const messageBeforeElement = document.createElement("p");
    const listElement = document.createElement("ul");
    listElement.classList.add("reconfirmation-list");
    const messageAfterElement = document.createElement("p");
    for (const domain of domains) {
      const itemElement = document.createElement("li");
      const strongElement = document.createElement("strong");
      strongElement.textContent = domain;
      itemElement.appendChild(strongElement);
      listElement.appendChild(itemElement);
    }
    messageBeforeElement.textContent = messageBefore;
    messageAfterElement.textContent = this.locale.get("Reconfirmation_confirmToSend");
    const contentElement = document.createElement("div");
    contentElement.appendChild(messageBeforeElement);
    contentElement.appendChild(listElement);
    contentElement.appendChild(messageAfterElement);
    return contentElement;
  }
}
