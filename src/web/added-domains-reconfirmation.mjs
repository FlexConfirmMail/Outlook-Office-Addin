/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
export class AddedDomainsReconfirmation {
  needToConfirm = false;
  newDomainAddresses = new Set();
  initialized = false;

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
    const originalToDomains = data.originalRecipients.to?.map((_) => _.domain) ?? [];
    const originalCcDomains = data.originalRecipients.cc?.map((_) => _.domain) ?? [];
    const originalBccDomains = data.originalRecipients.bcc?.map((_) => _.domain) ?? [];
    const originalRequiredAttendeesDomains = data.originalRecipients.requiredAttendees?.map((_) => _.domain) ?? [];
    const originalOptionalAttendeesDomains = data.originalRecipients.optionalAttendees?.map((_) => _.domain) ?? [];
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
    const targetRecipients = new Set([...to, ...cc, ...bcc, ...requiredAttendees, ...optionalAttendees]);
    for (const recipient of targetRecipients) {
      if (originalDomains.has(recipient.domain)) {
        continue;
      }
      this.newDomainAddresses.add(recipient.address);
    }
    this.needToConfirm = this.newDomainAddresses.size > 0;
    if (!this.needToConfirm) {
      return;
    }
  }

  initUI(sendStatusToParent) {
    const targetElement = $("#newly-added-domain-address-list");
    for (const address of this.newDomainAddresses) {
      const itemElement = $(`<li></li>`).appendTo(targetElement);
      const strongElement = $(`<strong></strong>`).appendTo(itemElement);
      strongElement.text(address);
    }
    window.onSendNewDomain = () => {
      $("#newly-added-domain-address-dialog").prop("hidden", true);
      sendStatusToParent("ok");
    };
    window.onCancelNewDomain = () => {
      $("#newly-added-domain-address-dialog").prop("hidden", true);
    };
  }

  show() {
    $("#newly-added-domain-address-dialog").prop("hidden", false);
  }
}
