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
    this.needToConfirmTooManyDomains = false;
    this.needToConfirmConversionRecommendation = false;
    this.needToReconfirmTooManyDomains = false;
    this.tooManyDomainsThreshold = 0;
    this.conversionRecommendationDomainsThreshold = 0;
    this.reconfirmationTooManyDomainsThreshold = 0;
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
    this.tooManyDomainsThreshold = data.config.common.SafeBccThreshold;
    this.conversionRecommendationDomainsThreshold =
      data.config.common.BccConversionRecommendationDomainsThreshold;
    this.reconfirmationTooManyDomainsThreshold = data.config.common.SafeBccReconfirmationThreshold;
    const to = data.target.to ?? [];
    const cc = data.target.cc ?? [];
    const requiredAttendees = data.target.requiredAttendees ?? [];
    const optionalAttendees = data.target.optionalAttendees ?? [];
    const recipients = [...to, ...cc, ...requiredAttendees, ...optionalAttendees];
    const domains = new Set(recipients.map((recipient) => recipient.domain));
    if (this.tooManyDomainsThreshold >= 1) {
      this.needToConfirmTooManyDomains = domains.size >= this.tooManyDomainsThreshold;
    }
    if (this.conversionRecommendationDomainsThreshold >= 1) {
      this.needToConfirmConversionRecommendation =
        domains.size >= this.conversionRecommendationDomainsThreshold;
    }
    if (this.reconfirmationTooManyDomainsThreshold >= 1) {
      this.needToReconfirmTooManyDomains = domains.size >= this.reconfirmationTooManyDomainsThreshold;
    }
    this.itemType = data.itemType;
  }

  generateReconfirmationContentElements() {
    const strongElement = document.createElement("strong");
    strongElement.textContent =
      this.itemType === Office.MailboxEnums.ItemType.Message
        ? this.locale.get("Reconfirmation_safeBccReconfirmationThresholdWarning", {
            threshold: this.reconfirmationTooManyDomainsThreshold,
          })
        : this.locale.get("Reconfirmation_safeBccReconfirmationThresholdAttendeesWarning", {
            threshold: this.reconfirmationTooManyDomainsThreshold,
          });
    const messageAfterElement = document.createElement("p");
    messageAfterElement.textContent = this.locale.get("Reconfirmation_confirmToSend");
    const contentElement = document.createElement("div");
    const messageBodyElement = document.createElement("p");
    messageBodyElement.appendChild(strongElement);
    contentElement.appendChild(messageBodyElement);
    contentElement.appendChild(messageAfterElement);
    return [contentElement];
  }

  get warningTooManyDomainsConfirmationItems() {
    if (!this.needToConfirmTooManyDomains) {
      return [];
    }

    switch (this.itemType) {
      case Office.MailboxEnums.ItemType.Message:
        return [
          {
            label: this.locale.get("confirmation_safeBccThresholdCheckboxLabel", {
              threshold: this.tooManyDomainsThreshold,
            }),
          },
        ];
      case Office.MailboxEnums.ItemType.Appointment:
      default:
        return [
          {
            label: this.locale.get("confirmation_safeBccThresholdForAttendeesCheckboxLabel", {
              threshold: this.tooManyDomainsThreshold,
            }),
          },
        ];
    }
  }

  get warningConversionRecommendationConfirmationItems() {
    if (!this.needToConfirmConversionRecommendation) {
      return [];
    }

    switch (this.itemType) {
      case Office.MailboxEnums.ItemType.Message:
        return [
          {
            label: this.locale.get(
              "confirmation_bccConversionRecommendationDomainsThresholdCheckboxLabel",
              {
                threshold: this.conversionRecommendationDomainsThreshold,
              }
            ),
          },
        ];
      case Office.MailboxEnums.ItemType.Appointment:
      default:
        // Appointment has no Bcc type recipients, so the warning message is same as threshold warning.
        // This message will be emphasized in the warning dialog.
        return [
          {
            label: this.locale.get("confirmation_safeBccThresholdForAttendeesCheckboxLabel", {
              threshold: this.conversionRecommendationDomainsThreshold,
            }),
          },
        ];
    }
  }
}
