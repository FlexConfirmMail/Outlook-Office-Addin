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
    this.rewarningAddresses = new Set(
      data.classified.recipients.rewarning.map((recipient) => recipient.address)
    );
    this.needToReconfirm = this.rewarningAddresses.size > 0;
  }

  generateReconfirmationContentElements() {
    const messageBeforeElement = document.createElement("p");
    const listElement = document.createElement("ul");
    listElement.classList.add("reconfirmation-list");
    const messageAfterElement = document.createElement("p");
    for (const address of this.rewarningAddresses) {
      const itemElement = document.createElement("li");
      const strongElement = document.createElement("strong");
      strongElement.textContent = address;
      itemElement.appendChild(strongElement);
      listElement.appendChild(itemElement);
    }
    messageBeforeElement.textContent = this.locale.get("Reconfirmation_unsafeAddresses");
    messageAfterElement.textContent = this.locale.get("Reconfirmation_confirmToSend");
    const contentElement = document.createElement("div");
    contentElement.appendChild(messageBeforeElement);
    contentElement.appendChild(listElement);
    contentElement.appendChild(messageAfterElement);
    return [contentElement];
  }
}
