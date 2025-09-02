/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { L10n } from "./l10n.mjs";

export class AddedDomainsReconfirmation {
  needToReconfirm = false;
  newDomainAddresses = new Set();
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
    if (!data.config.common.SafeNewDomainsEnabled) {
      return;
    }
    if (!data.originalRecipients) {
      return;
    }
    this.itemType = data.itemType;
    const originalToDomains = data.originalRecipients.to?.map((_) => _.domain) ?? [];
    const originalCcDomains = data.originalRecipients.cc?.map((_) => _.domain) ?? [];
    const originalBccDomains = data.originalRecipients.bcc?.map((_) => _.domain) ?? [];
    const originalRequiredAttendeesDomains =
      data.originalRecipients.requiredAttendees?.map((_) => _.domain) ?? [];
    const originalOptionalAttendeesDomains =
      data.originalRecipients.optionalAttendees?.map((_) => _.domain) ?? [];
    const originalDomains = new Set([
      ...originalToDomains,
      ...originalCcDomains,
      ...originalBccDomains,
      ...originalRequiredAttendeesDomains,
      ...originalOptionalAttendeesDomains,
    ]);
    if (originalDomains.size === 0) {
      return;
    }
    const to = data.target.to ?? [];
    const cc = data.target.cc ?? [];
    const bcc = data.target.bcc ?? [];
    const requiredAttendees = data.target.requiredAttendees ?? [];
    const optionalAttendees = data.target.optionalAttendees ?? [];
    const targetRecipients = new Set([
      ...to,
      ...cc,
      ...bcc,
      ...requiredAttendees,
      ...optionalAttendees,
    ]);
    for (const recipient of targetRecipients) {
      if (originalDomains.has(recipient.domain)) {
        continue;
      }
      this.newDomainAddresses.add(recipient.address);
    }
    this.needToReconfirm = this.newDomainAddresses.size > 0;
  }

  generateReconfirmationContentElement() {
    const messageBeforeElement = document.createElement("p");
    const listElement = document.createElement("ul");
    listElement.classList.add("reconfirmation-list");
    const messageAfterElement = document.createElement("p");
    for (const address of this.newDomainAddresses) {
      const itemElement = document.createElement("li");
      const strongElement = document.createElement("strong");
      strongElement.textContent = address;
      itemElement.appendChild(strongElement);
      listElement.appendChild(itemElement);
    }
    messageBeforeElement.textContent =
      this.itemType === Office.MailboxEnums.ItemType.Message
        ? this.locale.get("newlyAddedDomainReconfirmation_messageBefore")
        : this.locale.get("newlyAddedDomainReconfirmation_messageBeforeForAppointment");
    messageAfterElement.textContent = this.locale.get("Reconfirmation_confirmToSend");
    const contentElement = document.createElement("div");
    contentElement.appendChild(messageBeforeElement);
    contentElement.appendChild(listElement);
    contentElement.appendChild(messageAfterElement);
    return contentElement;
  }
}
