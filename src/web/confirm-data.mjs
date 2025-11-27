/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { RecipientClassifier } from "./recipient-classifier.mjs";
import { AttachmentClassifier } from "./attachment-classifier.mjs";
import { UnsafeBodiesConfirmation } from "./unsafe-bodies-confirmation.mjs";
import { ConfigLoader } from "./config-loader.mjs";
import { OfficeDataAccessHelper } from "./office-data-access-helper.mjs";

// The data scheme:
// data = {
//   target: {
//     to : [{emailAddress:"mail@example.com"}, ...],
//     cc : [...],
//     bcc : [...],
//     requiredAttendees : [...],
//     optionalAttendees : [...],
//     attachments: [{name:"...",size:0,isInline:false}, ...],
//   },
//   config: {
//     trustedDomains : ["example.com", ...],
//     unsafeDomains : { "WARNING": [...] } ,
//     unsafeFiles : { "WARNING": [...] },
//   },
//   originalRecipients: {
//     to : [...],
//     cc : [...],
//     bcc : [...],
//   },
//   classified: {
//     { recipients:
//       trusted: [...],
//       untrusted: [...],
//       unsafeWithDomain: [...],
//       unsafe: [...],
//       blockWithDomain: [...],
//       block: [...],
//     }
//   },
//   itemType: Office.MailboxEnums.ItemType.Message,
// }
export class ConfirmData {
  target;
  config;
  originalRecipients;
  classified;
  itemType;
  locale;
  bodyBlockTargetWords;

  constructor({ target, config, originalRecipients, itemType, classified, locale }) {
    this.target = target;
    this.config = config;
    this.originalRecipients = originalRecipients;
    this.itemType = itemType;
    this.classified = classified;
    this.locale = locale;
    this.bodyBlockTargetWords = [];
  }

  classifyTarget() {
    this.classified = {};
    const { trustedDomains, unsafeDomains, common } = this.config;
    switch (this.itemType) {
      case Office.MailboxEnums.ItemType.Message: {
        const { to, cc, bcc } = this.target;
        this.classified.recipients = RecipientClassifier.classifyAll({
          locale: this.locale,
          to,
          cc,
          bcc,
          trustedDomains,
          unsafeDomains,
          commonConfig: common,
        });
        break;
      }
      case Office.MailboxEnums.ItemType.Appointment:
      default: {
        const { requiredAttendees, optionalAttendees } = this.target;
        this.classified.recipients = RecipientClassifier.classifyAll({
          locale: this.locale,
          requiredAttendees,
          optionalAttendees,
          trustedDomains,
          unsafeDomains,
          commonConfig: common,
        });
        break;
      }
    }
    this.classified.attachments = AttachmentClassifier.classify(this);
  }

  setUnsafeBodiesBlockStatus(language) {
    // No need to wait to ready because we don't access "locale" in
    // UnsafeBodiesConfirmation.
    const unsafeBodiesConfirmation = new UnsafeBodiesConfirmation(language);
    unsafeBodiesConfirmation.init(this);
    this.bodyBlockTargetWords = unsafeBodiesConfirmation.blockTargetWords;
  }

  get blockSending() {
    return (
      this.bodyBlockTargetWords.length > 0 ||
      this.classified.recipients.block.length > 0 ||
      this.classified.recipients.blockWithDomain.length > 0 ||
      this.classified.attachments.block.length > 0
    );
  }

  get skipConfirm() {
    return this.config.common.MainSkipIfNoExt && this.classified.recipients.untrusted.length == 0;
  }

  get skipCountDown() {
    if (!this.config.common.CountEnabled) {
      return true;
    }
    if (this.config.common.CountSeconds <= 0) {
      return true;
    }
    return this.config.common.CountSkipIfNoExt && this.classified.recipients.untrusted.length == 0;
  }

  get delayDelivery() {
    return (
      this.itemType === Office.MailboxEnums.ItemType.Message &&
      this.config.common?.DelayDeliveryEnabled
    );
  }

  get skipAll() {
    const appointmentConfirmationEnabled =
      this.config.common?.AppointmentConfirmationEnabled ?? false;
    return (
      this.itemType === Office.MailboxEnums.ItemType.Appointment && !appointmentConfirmationEnabled
    );
  }

  get needToConvertToBcc() {
    if (
      !this.config.common?.ConvertToBccEnabled ||
      this.itemType === Office.MailboxEnums.ItemType.Appointment
    ) {
      return false;
    }

    const nonBccRecipientsLength = this.target.to.length + this.target.cc.length;
    if (this.config.common?.ConvertToBccThreshold > 0) {
      return nonBccRecipientsLength >= this.config.common.ConvertToBccThreshold;
    }
    return false;
  }

  convertRecipientsToBcc() {
    this.target.bcc = this.target.bcc.concat(this.target.to);
    this.target.bcc = this.target.bcc.concat(this.target.cc);
    this.target.to = [];
    this.target.cc = [];
    this.classifyTarget();
    return false;
  }

  static async getCurrentDataAsync(itemType, locale) {
    const messageData =
      itemType == Office.MailboxEnums.ItemType.Message
        ? await OfficeDataAccessHelper.getAllMailData()
        : await OfficeDataAccessHelper.getAllAppointmentData();
    messageData.locale = locale;
    const confirmData = new ConfirmData(messageData);
    confirmData.config = await ConfigLoader.loadEffectiveConfig();
    confirmData.classifyTarget();
    confirmData.setUnsafeBodiesBlockStatus(locale.language);
    return confirmData;
  }
}
