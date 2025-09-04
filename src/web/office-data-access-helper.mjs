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
  ]);

  static getBccAsync() {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.bcc.getAsync((asyncResult) => {
          const recipients = asyncResult.value.map((officeAddonRecipient) => ({
            ...officeAddonRecipient,
            ...RecipientParser.parse(officeAddonRecipient.emailAddress),
          }));
          resolve(recipients);
        });
      } catch (error) {
        console.log(`Error while getting Bcc: ${error}`);
        reject(error);
      }
    });
  }

  static setBccAsync(recipients) {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.bcc.setAsync(recipients, (asyncResult) => {
          if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
            resolve(recipients);
          } else {
            console.log(`Error while setting Bcc: ${asyncResult.error.message}`);
            reject(asyncResult.error);
          }
        });
      } catch (error) {
        console.log(`Error while setting Bcc: ${error}`);
        reject(error);
      }
    });
  }

  static getCcAsync() {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.cc.getAsync((asyncResult) => {
          const recipients = asyncResult.value.map((officeAddonRecipient) => ({
            ...officeAddonRecipient,
            ...RecipientParser.parse(officeAddonRecipient.emailAddress),
          }));
          resolve(recipients);
        });
      } catch (error) {
        console.log(`Error while getting Cc: ${error}`);
        reject(error);
      }
    });
  }

  static setCcAsync(recipients) {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.cc.setAsync(recipients, (asyncResult) => {
          if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
            resolve(recipients);
          } else {
            console.log(`Error while setting Cc: ${asyncResult.error.message}`);
            reject(asyncResult.error);
          }
        });
      } catch (error) {
        console.log(`Error while setting Cc: ${error}`);
        reject(error);
      }
    });
  }

  static getSubjectAsync() {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.subject.getAsync((asyncResult) => {
          const subject = asyncResult.value;
          resolve(subject);
        });
      } catch (error) {
        console.log(`Error while getting subject: ${error}`);
        reject(error);
      }
    });
  }

  static getBodyAsync(coerctionType = Office.CoercionType.Html) {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.body.getAsync(
          coerctionType,
          { bodyMode: Office.MailboxEnums.BodyMode.Full },
          (asyncResult) => {
            const body = asyncResult.value;
            resolve(body);
          }
        );
      } catch (error) {
        console.log(`Error while getting body: ${error}`);
        reject(error);
      }
    });
  }

  static getItemIdAsync() {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.getItemIdAsync((asyncResult) => {
          const id = asyncResult.value;
          resolve(id);
        });
      } catch (error) {
        console.log(`Error while getting itemId: ${error}`);
        reject(error);
      }
    });
  }

  static getRequiredAttendeeAsync() {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.requiredAttendees.getAsync((asyncResult) => {
          const recipients = asyncResult.value.map((officeAddonRecipient) => ({
            ...officeAddonRecipient,
            ...RecipientParser.parse(officeAddonRecipient.emailAddress),
          }));
          resolve(recipients);
        });
      } catch (error) {
        console.log(`Error while getting required attendees: ${error}`);
        reject(error);
      }
    });
  }

  static getOptionalAttendeeAsync() {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.optionalAttendees.getAsync((asyncResult) => {
          const recipients = asyncResult.value.map((officeAddonRecipient) => ({
            ...officeAddonRecipient,
            ...RecipientParser.parse(officeAddonRecipient.emailAddress),
          }));
          resolve(recipients);
        });
      } catch (error) {
        console.log(`Error while getting optional attendees: ${error}`);
        reject(error);
      }
    });
  }

  static getToAsync() {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.to.getAsync((asyncResult) => {
          const recipients = asyncResult.value.map((officeAddonRecipient) => ({
            ...officeAddonRecipient,
            ...RecipientParser.parse(officeAddonRecipient.emailAddress),
          }));
          resolve(recipients);
        });
      } catch (error) {
        console.log(`Error while getting To: ${error}`);
        reject(error);
      }
    });
  }

  static setToAsync(recipients) {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.to.setAsync(recipients, (asyncResult) => {
          if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
            resolve(recipients);
          } else {
            console.log(`Error while setting To: ${asyncResult.error.message}`);
            reject(asyncResult.error);
          }
        });
      } catch (error) {
        console.log(`Error while setting To: ${error}`);
        reject(error);
      }
    });
  }

  static getSessionDataAsync(key) {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.sessionData.getAsync(key, (asyncResult) => {
          if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
            resolve(asyncResult.value);
          } else {
            console.debug(`Error while getting SessionData [${key}]: ${asyncResult.error.message}`);
            // Regards no value
            resolve("");
          }
        });
      } catch (error) {
        console.log(`Error while getting SessionData [${key}]: ${error}`);
        reject(error);
      }
    });
  }

  static getAttachmentsAsync() {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.getAttachmentsAsync((asyncResult) => {
          const attachments = asyncResult.value;
          const maybeFiles = attachments.filter((attachment) =>
            OfficeDataAccessHelper.CONFIRM_ATTACHMENT_TYPES.has(attachment.attachmentType)
          );
          resolve(maybeFiles);
        });
      } catch (error) {
        console.log(`Error while getting attachments: ${error}`);
        reject(error);
      }
    });
  }

  static getDelayDeliveryTime() {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.delayDeliveryTime.getAsync((asyncResult) => {
          const value = asyncResult.value;
          resolve(value);
        });
      } catch (error) {
        console.log(`Error while getting DelayDeliveryTime: ${error}`);
        reject(error);
      }
    });
  }

  static setDelayDeliveryTimeAsync(deliveryTime) {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.delayDeliveryTime.setAsync(deliveryTime, (asyncResult) => {
          if (asyncResult.status === Office.AsyncResultStatus.Failed) {
            console.log(asyncResult.error.message);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        console.log(`Error while setting DelayDeliveryTime: ${error}`);
        reject(error);
      }
    });
  }

  static setSessionDataAsync(key, value) {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.sessionData.setAsync(key, value, (asyncResult) => {
          if (asyncResult.status === Office.AsyncResultStatus.Failed) {
            console.log(asyncResult.error.message);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        console.log(`Error while setting SessionData: ${error}`);
        reject(error);
      }
    });
  }

  static removeSessionDataAsync(key) {
    return new Promise((resolve, reject) => {
      try {
        Office.context.mailbox.item.sessionData.removeAsync(key, (asyncResult) => {
          if (asyncResult.status === Office.AsyncResultStatus.Failed) {
            console.log(asyncResult.error.message);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        console.log(`Error while removing SessionData: ${error}`);
        reject(error);
      }
    });
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
    const [to, cc, bcc, subject, body, bodyText, attachments] = await Promise.all([
      OfficeDataAccessHelper.getToAsync(),
      OfficeDataAccessHelper.getCcAsync(),
      OfficeDataAccessHelper.getBccAsync(),
      OfficeDataAccessHelper.getSubjectAsync(),
      OfficeDataAccessHelper.getBodyAsync(),
      OfficeDataAccessHelper.getBodyAsync(Office.CoercionType.Text),
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
        attachments,
      },
      originalRecipients,
      itemType: Office.MailboxEnums.ItemType.Message,
    };
  }

  static async getAllAppointmentData() {
    const [requiredAttendees, optionalAttendees, subject, body, bodyText, attachments] =
      await Promise.all([
        OfficeDataAccessHelper.getRequiredAttendeeAsync(),
        OfficeDataAccessHelper.getOptionalAttendeeAsync(),
        OfficeDataAccessHelper.getSubjectAsync(),
        OfficeDataAccessHelper.getBodyAsync(),
        OfficeDataAccessHelper.getBodyAsync(Office.CoercionType.Text),
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
        attachments,
      },
      originalRecipients: originalAttendees,
      itemType: Office.MailboxEnums.ItemType.Appointment,
    };
  }
}
