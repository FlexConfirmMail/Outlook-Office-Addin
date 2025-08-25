/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { L10n } from "./l10n.mjs";
import { ConfigLoader } from "./config-loader.mjs";
import { ConfirmData } from "./confirm-data.mjs";
import { OfficeDataAccessHelper } from "./office-data-access-helper.mjs";

let locale;

Office.onReady(() => {
  const language = Office.context.displayLanguage;
  document.documentElement.setAttribute("lang", language);
  locale = L10n.get(language);
  locale.ready.then(() => locale.translateAll());
});

function sleepAsync(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


function getSubjectAsync() {
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

function getBodyAsync() {
  return new Promise((resolve, reject) => {
    try {
      Office.context.mailbox.item.body.getAsync(
        Office.CoercionType.Html,
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
async function openDialog({ url, data, asyncContext, promptBeforeOpen, ...params }) {
  const asyncResult = await new Promise((resolve) => {
    Office.context.ui.displayDialogAsync(
      url,
      {
        asyncContext,
        displayInIframe: !promptBeforeOpen,
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
        await sleepAsync(200);
        return openDialog({ url, data, asyncContext, ...params });

      case 12011:
        // Maybe we never reach this case because we specify displayInIframe = true at the
        // first time and then displayDialogAsync does not open a new popup dialog.
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
  console.debug("classified: ", data.classified);

  if (data.shouldBlock()) {
    const { status, asyncContext: updatedAsyncContext } = await openDialog({
      url: window.location.origin + "/block.html",
      data,
      asyncContext,
      height: Math.min(40, charsToPercentage(30, screen.availHeight)),
      width: Math.min(80, charsToPercentage(60, screen.availWidth)),
    });
    console.debug("status: ", status);
    asyncContext = updatedAsyncContext;
    return {
      allowed: false,
      asyncContext,
    };
  }

  if (data.shouldSkipConfirm()) {
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
    width: Math.min(80, charsToPercentage(60, screen.availWidth)),
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

async function onItemSend(event) {
  let asyncContext = event;
  const data = await ConfirmData.generateNewDataAsync(
    Office.context.mailbox.item.itemType,
    this.locale
  );
  console.debug(data);
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

  if (data.shouldDelayDelivery()) {
    const currentSetting = await OfficeDataAccessHelper.getDelayDeliveryTime();
    if (currentSetting == 0) {
      const currentTime = new Date().getTime();
      const delayDeliverySeconds = data.config.common?.DelayDeliverySeconds ?? 60;
      const delayInMilliseconds = delayDeliverySeconds * 1000;
      const deliveryTime = new Date(currentTime + delayInMilliseconds);
      await OfficeDataAccessHelper.setDelayDeliveryTimeAsync(deliveryTime);
    }
  }
  await OfficeDataAccessHelper.removeOriginalRecipientsSessionDataAsync(data.itemType);
  asyncContext.completed({ allowEvent: true });
}
window.onItemSend = onItemSend;

async function onNewMessageComposeCreated(event) {
  const [to, cc, bcc] = await Promise.all([
    OfficeDataAccessHelper.getToAsync(),
    OfficeDataAccessHelper.getCcAsync(),
    OfficeDataAccessHelper.getBccAsync(),
  ]);
  if (to.length > 0 || cc.length > 0 || bcc.length > 0) {
    const originalRecipients = {
      to,
      cc,
      bcc,
    };
    await OfficeDataAccessHelper.setOriginalRecipientsSessionDataAsync(
      Office.context.mailbox.item.itemType,
      JSON.stringify(originalRecipients)
    );
  }
  event.completed();
}
window.onNewMessageComposeCreated = onNewMessageComposeCreated;

async function onAppointmentOrganizer(event) {
  const [requiredAttendees, optionalAttendees] = await Promise.all([
    OfficeDataAccessHelper.getRequiredAttendeeAsync(),
    OfficeDataAccessHelper.getOptionalAttendeeAsync(),
  ]);

  if (Office.context.platform == Office.PlatformType.PC) {
    // On classic Outlook, requiredAttendees has a current user even if
    // this is a new appointment, in that case, subsequent processing
    // erroneously determines that there are existing attendees.
    // This function has nothing to do if this is a new appointment
    // because there is no existing attendees. So return if this is a
    // new appointment.
    const id = await OfficeDataAccessHelper.getItemIdAsync();
    if (!id) {
      // On classic Outlook, if the id is not defined, this is a new appointment.
      event.completed();
      return;
    }
  }

  if (requiredAttendees.length > 0 || optionalAttendees.length > 0) {
    const originalAttendees = {
      requiredAttendees,
      optionalAttendees,
    };
    await OfficeDataAccessHelper.setOriginalRecipientsSessionDataAsync(
      Office.context.mailbox.item.itemType,
      JSON.stringify(originalAttendees)
    );
  }
  event.completed();
}
window.onAppointmentOrganizer = onAppointmentOrganizer;

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
    width: Math.min(80, charsToPercentage(80, screen.availWidth)),
  });
  console.debug(`onOpensettingDialog: ${status}`);
  updatedAsyncContext.completed({ allowEvent: true });
}
window.onOpenSettingDialog = onOpenSettingDialog;

Office.actions.associate("onNewMessageComposeCreated", onNewMessageComposeCreated);
Office.actions.associate("onAppointmentOrganizer", onAppointmentOrganizer);
