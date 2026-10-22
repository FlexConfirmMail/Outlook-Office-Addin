/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import * as RecipientParser from "./recipient-parser.mjs";

export class OfficeDataAccessHelper {
  static ORIGINAL_RECIPIENTS_KEY = "FCM_OriginalRecipients";
  static ORIGINAL_ATTENDEES_KEY = "FCM_OriginalAttendees";
  static CONFIRM_ATTACHMENT_TYPES = new Set([
    // Office.MailboxEnums are not accessible before initialized.
    "cloud", // Office.MailboxEnums.AttachmentType.Cloud,
    "file", // Office.MailboxEnums.AttachmentType.File,
    "item", // Office.MailboxEnums.AttachmentType.Item,
  ]);

  // Wrap an Office API, which reports its result to a callback, as a Promise.
  //  * "description" is used for error logs: "Error while ${description}".
  //  * "invoke" is called with the callback to be given to the Office API.
  //    Note that the API must be called in it as a method, to keep its "this".
  //  * "onSucceeded" converts the reported value to the value to be resolved.
  //  * "onFailed" is called when the Office API reports a failure, and its
  //    returned value is resolved. The promise is rejected when it is omitted.
  //  * "log" is the logging function for reported failures.
  static runAsync(description, invoke, { onSucceeded, onFailed, log = console.log } = {}) {
    return new Promise((resolve, reject) => {
      const onResult = (asyncResult) => {
        // Exceptions raised in this callback are never caught by the try-catch
        // for "invoke" below, because this is called asynchronously. They must
        // be caught here, otherwise the promise is never settled and the caller
        // waits for it forever.
        try {
          if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
            resolve(onSucceeded ? onSucceeded(asyncResult.value) : asyncResult.value);
            return;
          }
          log(`Error while ${description}: ${asyncResult.error?.message}`);
          if (onFailed) {
            resolve(onFailed(asyncResult.error));
          } else {
            reject(asyncResult.error);
          }
        } catch (error) {
          console.log(`Error while ${description}: ${error}`);
          reject(error);
        }
      };
      try {
        invoke(onResult);
      } catch (error) {
        console.log(`Error while ${description}: ${error}`);
        reject(error);
      }
    });
  }

  static toRecipients(officeAddonRecipients) {
    return officeAddonRecipients.map((officeAddonRecipient) => ({
      ...officeAddonRecipient,
      ...RecipientParser.parse(officeAddonRecipient.emailAddress),
    }));
  }

  static getBccAsync() {
    return OfficeDataAccessHelper.runAsync(
      "getting Bcc",
      (onResult) => Office.context.mailbox.item.bcc.getAsync(onResult),
      { onSucceeded: OfficeDataAccessHelper.toRecipients }
    );
  }

  static setBccAsync(recipients) {
    return OfficeDataAccessHelper.runAsync(
      "setting Bcc",
      (onResult) => Office.context.mailbox.item.bcc.setAsync(recipients, onResult),
      { onSucceeded: () => recipients }
    );
  }

  static getCcAsync() {
    return OfficeDataAccessHelper.runAsync(
      "getting Cc",
      (onResult) => Office.context.mailbox.item.cc.getAsync(onResult),
      { onSucceeded: OfficeDataAccessHelper.toRecipients }
    );
  }

  static setCcAsync(recipients) {
    return OfficeDataAccessHelper.runAsync(
      "setting Cc",
      (onResult) => Office.context.mailbox.item.cc.setAsync(recipients, onResult),
      { onSucceeded: () => recipients }
    );
  }

  static clearCcAsync() {
    return OfficeDataAccessHelper.setCcAsync([]);
  }

  static getSubjectAsync() {
    return OfficeDataAccessHelper.runAsync(
      "getting subject",
      (onResult) => Office.context.mailbox.item.subject.getAsync(onResult),
      // Regards no value, as before.
      { onFailed: () => undefined }
    );
  }

  static getBodyAsync(coerctionType = Office.CoercionType.Html) {
    return OfficeDataAccessHelper.runAsync(
      "getting body",
      (onResult) =>
        Office.context.mailbox.item.body.getAsync(
          coerctionType,
          { bodyMode: Office.MailboxEnums.BodyMode.Full },
          onResult
        ),
      // Regards no value, as before.
      { onFailed: () => undefined }
    );
  }

  static getItemIdAsync() {
    return OfficeDataAccessHelper.runAsync(
      "getting itemId",
      (onResult) => Office.context.mailbox.item.getItemIdAsync(onResult),
      // The id is unavailable for a new appointment on classic Outlook, and
      // onAppointmentOrganizer() detects it by the resolved value. Thus this
      // must not be rejected on failure.
      { onFailed: () => undefined }
    );
  }

  static getRequiredAttendeeAsync() {
    return OfficeDataAccessHelper.runAsync(
      "getting required attendees",
      (onResult) => Office.context.mailbox.item.requiredAttendees.getAsync(onResult),
      { onSucceeded: OfficeDataAccessHelper.toRecipients }
    );
  }

  static getOptionalAttendeeAsync() {
    return OfficeDataAccessHelper.runAsync(
      "getting optional attendees",
      (onResult) => Office.context.mailbox.item.optionalAttendees.getAsync(onResult),
      { onSucceeded: OfficeDataAccessHelper.toRecipients }
    );
  }

  static getToAsync() {
    return OfficeDataAccessHelper.runAsync(
      "getting To",
      (onResult) => Office.context.mailbox.item.to.getAsync(onResult),
      { onSucceeded: OfficeDataAccessHelper.toRecipients }
    );
  }

  static setToAsync(recipients) {
    return OfficeDataAccessHelper.runAsync(
      "setting To",
      (onResult) => Office.context.mailbox.item.to.setAsync(recipients, onResult),
      { onSucceeded: () => recipients }
    );
  }

  static clearToAsync() {
    return OfficeDataAccessHelper.setToAsync([]);
  }

  static getSessionDataAsync(key) {
    return OfficeDataAccessHelper.runAsync(
      `getting SessionData [${key}]`,
      (onResult) => Office.context.mailbox.item.sessionData.getAsync(key, onResult),
      // Regards no value, as before. A missing key is not an error.
      { onFailed: () => "", log: console.debug }
    );
  }

  static getAttachmentsAsync() {
    return OfficeDataAccessHelper.runAsync(
      "getting attachments",
      (onResult) => Office.context.mailbox.item.getAttachmentsAsync(onResult),
      {
        onSucceeded: (attachments) =>
          attachments.filter((attachment) =>
            OfficeDataAccessHelper.CONFIRM_ATTACHMENT_TYPES.has(attachment.attachmentType)
          ),
      }
    );
  }

  static getDelayDeliveryTime() {
    return OfficeDataAccessHelper.runAsync(
      "getting DelayDeliveryTime",
      (onResult) => Office.context.mailbox.item.delayDeliveryTime.getAsync(onResult),
      // Regards no value, as before.
      { onFailed: () => undefined }
    );
  }

  static getBodyTypeAsync() {
    return OfficeDataAccessHelper.runAsync("getting body type", (onResult) =>
      Office.context.mailbox.item.body.getTypeAsync(onResult)
    );
  }

  static setDelayDeliveryTimeAsync(deliveryTime) {
    return OfficeDataAccessHelper.runAsync(
      "setting DelayDeliveryTime",
      (onResult) => Office.context.mailbox.item.delayDeliveryTime.setAsync(deliveryTime, onResult),
      { onSucceeded: () => true, onFailed: () => false }
    );
  }

  static setSessionDataAsync(key, value) {
    return OfficeDataAccessHelper.runAsync(
      `setting SessionData [${key}]`,
      (onResult) => Office.context.mailbox.item.sessionData.setAsync(key, value, onResult),
      { onSucceeded: () => true, onFailed: () => false }
    );
  }

  static removeSessionDataAsync(key) {
    return OfficeDataAccessHelper.runAsync(
      `removing SessionData [${key}]`,
      (onResult) => Office.context.mailbox.item.sessionData.removeAsync(key, onResult),
      { onSucceeded: () => true, onFailed: () => false }
    );
  }

  static async setOriginalRecipientsSessionDataAsync(itemType, value) {
    const key =
      itemType == Office.MailboxEnums.ItemType.Message
        ? OfficeDataAccessHelper.ORIGINAL_RECIPIENTS_KEY
        : OfficeDataAccessHelper.ORIGINAL_ATTENDEES_KEY;
    await OfficeDataAccessHelper.setSessionDataAsync(key, value);
  }

  static async removeOriginalRecipientsSessionDataAsync(itemType) {
    const key =
      itemType == Office.MailboxEnums.ItemType.Message
        ? OfficeDataAccessHelper.ORIGINAL_RECIPIENTS_KEY
        : OfficeDataAccessHelper.ORIGINAL_ATTENDEES_KEY;
    await OfficeDataAccessHelper.removeSessionDataAsync(key);
  }

  static async getAllMailData() {
    const [to, cc, bcc, subject, body, bodyText, bodyType, attachments] = await Promise.all([
      OfficeDataAccessHelper.getToAsync(),
      OfficeDataAccessHelper.getCcAsync(),
      OfficeDataAccessHelper.getBccAsync(),
      OfficeDataAccessHelper.getSubjectAsync(),
      OfficeDataAccessHelper.getBodyAsync(),
      OfficeDataAccessHelper.getBodyAsync(Office.CoercionType.Text),
      OfficeDataAccessHelper.getBodyTypeAsync(),
      OfficeDataAccessHelper.getAttachmentsAsync(),
    ]);
    let originalRecipients = {};
    const originalRecipientsJson = await OfficeDataAccessHelper.getSessionDataAsync(
      OfficeDataAccessHelper.ORIGINAL_RECIPIENTS_KEY
    );
    if (originalRecipientsJson) {
      originalRecipients = JSON.parse(originalRecipientsJson);
    }
    return {
      target: {
        to,
        cc,
        bcc,
        subject,
        body,
        bodyText,
        bodyType,
        attachments,
      },
      originalRecipients,
      itemType: Office.MailboxEnums.ItemType.Message,
    };
  }

  static async getAllAppointmentData() {
    const [requiredAttendees, optionalAttendees, subject, body, bodyText, bodyType, attachments] =
      await Promise.all([
        OfficeDataAccessHelper.getRequiredAttendeeAsync(),
        OfficeDataAccessHelper.getOptionalAttendeeAsync(),
        OfficeDataAccessHelper.getSubjectAsync(),
        OfficeDataAccessHelper.getBodyAsync(),
        OfficeDataAccessHelper.getBodyAsync(Office.CoercionType.Text),
        OfficeDataAccessHelper.getBodyTypeAsync(),
        OfficeDataAccessHelper.getAttachmentsAsync(),
      ]);
    let originalAttendees = {};
    const originalAttendeesJson = await OfficeDataAccessHelper.getSessionDataAsync(
      OfficeDataAccessHelper.ORIGINAL_ATTENDEES_KEY
    );
    if (originalAttendeesJson) {
      originalAttendees = JSON.parse(originalAttendeesJson);
    }
    return {
      target: {
        requiredAttendees,
        optionalAttendees,
        subject,
        body,
        bodyText,
        bodyType,
        attachments,
      },
      originalRecipients: originalAttendees,
      itemType: Office.MailboxEnums.ItemType.Appointment,
    };
  }
}
