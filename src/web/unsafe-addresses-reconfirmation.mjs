/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { L10n } from "./l10n.mjs";

export class UnsafeAddressesReconfirmation {
  needToReconfirm = false;
  rewarningAddresses = new Set();
  // Addresses with custom messages: Map of message => Set of addresses.
  rewarningAddressesByMessage = new Map();
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
    for (const recipient of data.classified.recipients.rewarning) {
      let target = recipient.address;
      if (!target || target === "") {
        target = recipient.displayName;
      }
      if (!target || target === "") {
        target = "Unknown";
      }
      if (!recipient.rewarningMessage) {
        this.rewarningAddresses.add(target);
        continue;
      }
      // The custom message can be a message ID defined in locales or custom-locales.
      // If it is not a message ID, L10n returns it with placeholders replaced.
      const message = this.locale.get(recipient.rewarningMessage, {
        domain: recipient.domain.toLowerCase(),
        address: recipient.address,
      });
      if (!this.rewarningAddressesByMessage.has(message)) {
        this.rewarningAddressesByMessage.set(message, new Set());
      }
      this.rewarningAddressesByMessage.get(message).add(target);
    }
    this.needToReconfirm =
      this.rewarningAddresses.size > 0 || this.rewarningAddressesByMessage.size > 0;
  }

  generateReconfirmationContentElements() {
    const contentElements = [];
    if (this.rewarningAddresses.size > 0) {
      contentElements.push(
        this.generateContentElement(
          this.locale.get("Reconfirmation_unsafeAddresses"),
          this.rewarningAddresses
        )
      );
    }
    for (const [message, addresses] of this.rewarningAddressesByMessage) {
      contentElements.push(this.generateContentElement(message, addresses));
    }
    return contentElements;
  }

  generateContentElement(messageBefore, addresses) {
    const messageBeforeElement = document.createElement("p");
    const listElement = document.createElement("ul");
    listElement.classList.add("reconfirmation-list");
    const messageAfterElement = document.createElement("p");
    for (const address of addresses) {
      const itemElement = document.createElement("li");
      const strongElement = document.createElement("strong");
      strongElement.textContent = address;
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
