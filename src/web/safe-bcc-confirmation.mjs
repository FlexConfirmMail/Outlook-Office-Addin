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
    this.clear();
  }

  clear() {
    this.shouldConfirm = false;
    this.threshold = 0;
    this.itemType = Office.MailboxEnums.ItemType.Message;
  }

  init(data) {
    this.clear();
    if (!data.config.common.SafeBccEnabled) {
      return;
    }
    this.threshold = data.config.common.SafeBccThreshold;
    if (this.threshold < 1) {
      return;
    }
    const to = data.target.to ?? [];
    const cc = data.target.cc ?? [];
    const requiredAttendees = data.target.requiredAttendees ?? [];
    const optionalAttendees = data.target.optionalAttendees ?? [];
    const recipients = [...to, ...cc, ...requiredAttendees, ...optionalAttendees];
    const domains = new Set(recipients.map((recipient) => recipient.domain));
    this.shouldConfirm = domains.size >= this.threshold;
    this.itemType = data.itemType;
  }

  get warningConfirmationItems() {
    if (!this.shouldConfirm) {
      return [];
    }

    switch (this.itemType){
      case Office.MailboxEnums.ItemType.Message:
        return [{ label: this.locale.get("confirmation_safeBccThresholdCheckboxLabel", { threshold: this.threshold }) }];
      case Office.MailboxEnums.ItemType.Appointment:
      default:
        return [{ label: this.locale.get("confirmation_safeBccThresholdForAttendeesCheckboxLabel", { threshold: this.threshold }) }];
    }
  }
}
