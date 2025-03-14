/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { ConfigLoader } from "./config-loader.mjs";
import * as RecipientParser from "./recipient-parser.mjs";
import { RecipientClassifier } from "./recipient-classifier.mjs";

const ORIGINAL_RECIPIENTS_KEY = "FCM_OriginalRecipients";
const CONFIRM_ATTACHMENT_TYPES = new Set([
  // Office.MailboxEnums are not accessible before initialized.
  "cloud", // Office.MailboxEnums.AttachmentType.Cloud,
  "file", // Office.MailboxEnums.AttachmentType.File,
]);

Office.initialize = (reason) => {
  console.debug("Office.initialize reasion = ", reason);
};

Office.onReady(() => {
  const language = Office.context.displayLanguage;
  document.documentElement.setAttribute("lang", language);
});

function getBccAsync() {
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

function getCcAsync() {
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

function getToAsync() {
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

function getSessionDataAsync(key) {
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

function getAttachmentsAsync() {
  return new Promise((resolve, reject) => {
    try {
      Office.context.mailbox.item.getAttachmentsAsync((asyncResult) => {
        const attachments = asyncResult.value;
        const maybeFiles = attachments.filter((attachment) => CONFIRM_ATTACHMENT_TYPES.has(attachment.attachmentType));
        resolve(maybeFiles);
      });
    } catch (error) {
      console.log(`Error while getting attachments: ${error}`);
      reject(error);
    }
  });
}

function getDelayDeliveryTime() {
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

function setDelayDeliveryTimeAsync(deliveryTime) {
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

function setSessionDataAsync(key, value) {
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

function removeSessionDataAsync(key) {
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

async function getAllData() {
  const [to, cc, bcc, attachments, config] = await Promise.all([
    getToAsync(),
    getCcAsync(),
    getBccAsync(),
    getAttachmentsAsync(),
    ConfigLoader.loadEffectiveConfig(),
  ]);
  let originalRecipients = {};
  const originalRecipientsJson = await getSessionDataAsync(ORIGINAL_RECIPIENTS_KEY);
  if (originalRecipientsJson) {
    originalRecipients = JSON.parse(originalRecipientsJson);
  }
  return {
    target: {
      to,
      cc,
      bcc,
      attachments,
    },
    config,
    originalRecipients,
  };
}

async function openDialog({ url, data, asyncContext, promptBeforeOpen, ...params }) {
  const asyncResult = await new Promise((resolve) => {
    Office.context.ui.displayDialogAsync(
      url,
      {
        asyncContext,
        promptBeforeOpen: promptBeforeOpen || false,
        ...params,
      },
      resolve
    );
  });

  asyncContext = asyncResult.asyncContext;
  if (asyncResult.status === Office.AsyncResultStatus.Failed) {
    console.log(`Failed to open dialog: ${asyncResult.error.code}`);
    switch (asyncResult.error.code) {
      case 12007:
        console.log(
          "could not open dialog before the previous dialog is not closed completely, so we need to retry it manually."
        );
        return openDialog({ url, data, asyncContext, ...params });

      case 12011:
        console.log("failed due to the browser's popup blocker.");
        if (promptBeforeOpen) {
          break;
        }
        console.log("retrying with prompt.");
        return openDialog({
          url,
          data,
          asyncContext,
          ...params,
          promptBeforeOpen: true,
        });

      default:
        break;
    }
    return {
      status: null,
      asyncContext,
    };
  }

  const dialog = asyncResult.value;
  return new Promise((resolve) => {
    dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
      const messageFromDialog = JSON.parse(arg.message);
      console.debug("messageFromDialog: ", messageFromDialog);
      if (messageFromDialog.status == "ready") {
        const messageToDialog = JSON.stringify(data);
        dialog.messageChild(messageToDialog);
      } else if (messageFromDialog.status == "saveUserConfig") {
        // We can't execute Office.context.roamingSettings.saveAsync in the dialog context
        // as Office API specification. In order to save the config to roamingSettings, we
        // should get the current config from the dialog message and save it in this function.
        const config = messageFromDialog.config ?? {};
        console.debug("user config: ", config);
        Office.context.roamingSettings.set("Common", config.commonString ?? "");
        Office.context.roamingSettings.set("TrustedDomains", config.trustedDomainsString ?? "");
        Office.context.roamingSettings.set("UnsafeDomains", config.unsafeDomainsString ?? "");
        Office.context.roamingSettings.set("UnsafeFiles", config.unsafeFilesString ?? "");
        Office.context.roamingSettings.saveAsync((saveResult) => {
          // This function should return (resolve) after finishing saveAsync.
          // If returing before finishing saveAsync, roamingSettings is not
          // updated until refresh the page.
          if (saveResult.status === Office.AsyncResultStatus.Succeeded) {
            console.debug("Settings saved successfully");
            dialog.close();
            resolve({
              status: messageFromDialog.status,
              asyncContext,
            });
          } else {
            console.error("Error saving settings:", saveResult.error.message);
            resolve({
              status: Office.AsyncResultStatus.Failed,
              asyncContext,
            });
          }
        });
      } else {
        dialog.close();
        resolve({
          status: messageFromDialog.status,
          asyncContext,
        });
      }
    });
    dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
      if (arg.error === 12006) {
        // Closed with the up-right "X" button.
        resolve({
          status: null,
          asyncContext,
        });
      }
    });
  });
}

function charsToPercentage(chars, maxSize) {
  const bodyFontSize = parseInt(window.getComputedStyle(document.body).fontSize);
  return Math.floor(((bodyFontSize * chars) / maxSize) * 100);
}

async function tryConfirm(data, asyncContext) {
  const { to, cc, bcc } = data.target;
  const { trustedDomains, unsafeDomains } = data.config;

  data.classified = RecipientClassifier.classifyAll({ to, cc, bcc, trustedDomains, unsafeDomains });
  console.debug("classified: ", data.classified);

  if (data.config.common.MainSkipIfNoExt && data.classified.untrusted.length == 0) {
    console.log("Skip confirmation: no untrusted recipient");
    return {
      allowed: true,
      asyncContext,
    };
  }

  const { status, asyncContext: updatedAsyncContext } = await openDialog({
    url: window.location.origin + "/confirm.html",
    data,
    asyncContext,
    height: Math.min(60, charsToPercentage(50, screen.availHeight)),
    width: Math.min(80, charsToPercentage(45, screen.availWidth)),
  });
  console.debug("status: ", status);

  asyncContext = updatedAsyncContext;

  if (status === null) {
    // failed to open, or closed by the closebox
    return {
      allowed: false,
      asyncContext,
    };
  }

  return {
    allowed: status === "ok",
    asyncContext,
  };
}

async function tryCountDown(data, asyncContext) {
  if (!data.config.common.CountEnabled) {
    return {
      allowed: true,
      asyncContext,
    };
  }

  if (data.config.common.CountSeconds <= 0) {
    return {
      allowed: true,
      asyncContext,
    };
  }

  const { status, asyncContext: updatedAsyncContext } = await openDialog({
    url: window.location.origin + "/count-down.html",
    data,
    asyncContext,
    height: Math.min(20, charsToPercentage(15, screen.availHeight)),
    width: Math.min(20, charsToPercentage(25, screen.availWidth)),
  });
  console.debug("status: ", status);

  asyncContext = updatedAsyncContext;

  if (status === null) {
    // failed to open, or closed by the closebox
    return {
      allowed: false,
      asyncContext,
    };
  }

  return {
    allowed: status === "ok" || status == "done" || status == "skip",
    asyncContext,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onItemSend(event) {
  console.debug("onItemSend ", event);
  const data = await getAllData();
  console.debug(data);

  let asyncContext = event;

  {
    const { allowed, asyncContext: updatedAsyncContext } = await tryConfirm(data, asyncContext);
    if (!allowed) {
      console.debug("canceled by confirmation");
      asyncContext.completed({ allowEvent: false });
      return;
    }
    asyncContext = updatedAsyncContext;
  }

  {
    const { allowed, asyncContext: updatedAsyncContext } = await tryCountDown(data, asyncContext);
    if (!allowed) {
      console.debug("canceled by countdown");
      asyncContext.completed({ allowEvent: false });
      return;
    }
    asyncContext = updatedAsyncContext;
  }

  console.debug("granted: continue to send");

  if (data.config.common?.DelayDeliveryEnabled) {
    const currentSetting = await getDelayDeliveryTime();
    if (currentSetting == 0) {
      const currentTime = new Date().getTime();
      const delayDeliverySeconds = data.config.common?.DelayDeliverySeconds ?? 60;
      const delayInMilliseconds = delayDeliverySeconds * 1000;
      const deliveryTime = new Date(currentTime + delayInMilliseconds);
      await setDelayDeliveryTimeAsync(deliveryTime);
    }
  }
  if (data.originalRecipients) {
    await removeSessionDataAsync(ORIGINAL_RECIPIENTS_KEY);
  }
  asyncContext.completed({ allowEvent: true });
}
window.onItemSend = onItemSend;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onNewMessageComposeCreated(event) {
  const [to, cc, bcc] = await Promise.all([getToAsync(), getCcAsync(), getBccAsync()]);
  if (to.length > 0 || cc.length > 0 || bcc.length > 0) {
    const originalRecipients = {
      to,
      cc,
      bcc,
    };
    await setSessionDataAsync(ORIGINAL_RECIPIENTS_KEY, JSON.stringify(originalRecipients));
  }
  event.completed();
}
window.onNewMessageComposeCreated = onNewMessageComposeCreated;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onOpenSettingDialog(event) {
  const policyConfig = await ConfigLoader.loadFileConfig();
  const userConfig = await ConfigLoader.loadUserConfig();
  const data = {
    policy: policyConfig,
    user: userConfig,
  };
  const asyncContext = event;
  const { status, asyncContext: updatedAsyncContext } = await openDialog({
    url: window.location.origin + "/setting.html",
    data,
    asyncContext,
    height: Math.min(80, charsToPercentage(70, screen.availHeight)),
    width: Math.min(80, charsToPercentage(70, screen.availWidth)),
  });
  console.debug(`onOpensettingDialog: ${status}`);
  updatedAsyncContext.completed({ allowEvent: true });
}
window.onOpenSettingDialog = onOpenSettingDialog;

Office.actions.associate("onNewMessageComposeCreated", onNewMessageComposeCreated);
