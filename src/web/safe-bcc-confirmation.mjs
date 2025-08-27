/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { L10n } from "./l10n.mjs";

export class SafeBccConfirmation {
  locale = null;

  constructor(language) {
    this.locale = L10n.get(language);
    this.ready = this.locale.ready;
    this.needToConfirm = false;
    this.needToReconfirm = false;
    this.threshold = 0;
    this.reconfirmationThreshold = 0;
    this.itemType = Office.MailboxEnums.ItemType.Message;
    this.initialized = false;
  }

  init(data) {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    if (!data.config.common.SafeBccEnabled) {
      return;
    }
    this.threshold = data.config.common.SafeBccThreshold;
    this.reconfirmationThreshold = data.config.common.SafeBccReconfirmationThreshold;
    const to = data.target.to ?? [];
    const cc = data.target.cc ?? [];
    const requiredAttendees = data.target.requiredAttendees ?? [];
    const optionalAttendees = data.target.optionalAttendees ?? [];
    const recipients = [...to, ...cc, ...requiredAttendees, ...optionalAttendees];
    const domains = new Set(recipients.map((recipient) => recipient.domain));
    if (this.threshold >= 1) {
      this.needToConfirm = domains.size >= this.threshold;
    }
    if (this.reconfirmationThreshold >= 1) {
      this.needToReconfirm = domains.size >= this.reconfirmationThreshold;
    }
    this.itemType = data.itemType;
  }

  generateReconfirmationContentElement() {
    const strongElement = document.createElement("strong");
    strongElement.textContent =
      this.itemType === Office.MailboxEnums.ItemType.Message
        ? this.locale.get("Reconfirmation_safeBccReconfirmationThresholdWarning", {
            threshold: this.reconfirmationThreshold,
          })
        : this.locale.get("Reconfirmation_safeBccReconfirmationThresholdAttendeesWarning", {
            threshold: this.reconfirmationThreshold,
          });
    const messageAfterElement = document.createElement("p");
    messageAfterElement.textContent = this.locale.get("Reconfirmation_confirmToSend");
    const contentElement = document.createElement("div");
    const messageBodyElement = document.createElement("p");
    messageBodyElement.appendChild(strongElement);
    contentElement.appendChild(messageBodyElement);
    contentElement.appendChild(messageAfterElement);
    return contentElement;
  }

  get warningConfirmationItems() {
    if (!this.needToConfirm) {
      return [];
    }

    switch (this.itemType) {
      case Office.MailboxEnums.ItemType.Message:
        return [
          {
            label: this.locale.get("confirmation_safeBccThresholdCheckboxLabel", {
              threshold: this.threshold,
            }),
          },
        ];
      case Office.MailboxEnums.ItemType.Appointment:
      default:
        return [
          {
            label: this.locale.get("confirmation_safeBccThresholdForAttendeesCheckboxLabel", {
              threshold: this.threshold,
            }),
          },
        ];
    }
  }
}
