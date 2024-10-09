import { ConfigLoader } from "./config-loader.mjs";
import * as RecipientParser from "./recipient-parser.mjs";
import { RecipientClassifier } from "./recipient-classifier.mjs";

const ORIGINAL_RECIPIENTS_KEY_PREFIX = "FCM_OriginalRecipients";
const CONFIRM_ATTACHMENT_TYPES = new Set([
  // Office.MailboxEnums are not accessible before initialized.
  "cloud", // Office.MailboxEnums.AttachmentType.Cloud,
  "file", // Office.MailboxEnums.AttachmentType.File,
]);

Office.initialize = (reason) => {
  console.debug("Office.initialize reasion = ", reason);
};

function getBccAsync() {
  return new Promise((resolve, reject) => {
    try {
      Office.context.mailbox.item.bcc.getAsync((asyncResult) => {
        resolve(RecipientParser.parse(asyncResult.value));
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
        resolve(RecipientParser.parse(asyncResult.value));
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
        resolve(RecipientParser.parse(asyncResult.value));
      });
    } catch (error) {
      console.log(`Error while getting To: ${error}`);
      reject(error);
    }
  });
}

function getMailIdAsync() {
  return new Promise((resolve, reject) => {
    try {
      Office.context.mailbox.item.getItemIdAsync((asyncResult) => {
        resolve(asyncResult.value);
      });
    } catch (error) {
      console.log(`Error while getting ItemId: ${error}`);
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

async function getAllData() {
  const [to, cc, bcc, attachments, mailId, config] = await Promise.all([
    getToAsync(),
    getCcAsync(),
    getBccAsync(),
    getAttachmentsAsync(),
    getMailIdAsync(),
    ConfigLoader.load(),
  ]);
  let originalRecipients = {};
  if (mailId) {
    const id = `${ORIGINAL_RECIPIENTS_KEY_PREFIX}_${mailId}`;
    const originalRecipientsJson = sessionStorage.getItem(id);
    if (originalRecipientsJson) {
      originalRecipients = JSON.parse(originalRecipientsJson);
    }
  }
  return {
    target: {
      to,
      cc,
      bcc,
      attachments,
    },
    config,
    mailId,
    originalRecipients,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onItemSend(event) {
  console.debug("onItemSend ", event);
  const data = await getAllData();
  console.debug(data);

  const to = data.target.to ? data.target.to.map((_) => _.emailAddress) : [];
  const cc = data.target.cc ? data.target.cc.map((_) => _.emailAddress) : [];
  const bcc = data.target.bcc ? data.target.bcc.map((_) => _.emailAddress) : [];
  const trustedDomains = data.config.trustedDomains;
  const unsafeDomains = data.config.unsafeDomains;

  data.classified = RecipientClassifier.classifyAll({ to, cc, bcc, trustedDomains, unsafeDomains });
  console.debug("classified: ", data.classified);

  if (data.config.common.MainSkipIfNoExt && data.classified.untrusted.length == 0) {
    console.log("Skip confirmation: no untrusted recipient");
    event.completed({ allowEvent: true });
    if (data.mailId) {
      sessionStorage.removeItem(data.mailId);
    }
    return;
  }

  // If the platform is web, to bypass pop-up blockers, we need to ask the users if they want to open a dialog.
  const needToPromptBeforeOpen = Office.context.mailbox.diagnostics.hostName === "OutlookWebApp";
  Office.context.ui.displayDialogAsync(
    window.location.origin + "/dialog.html",
    {
      asyncContext: event,
      height: 60,
      width: 60,
      promptBeforeOpen: needToPromptBeforeOpen,
    },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.log(`Failed to open dialog: ${asyncResult.error.code}`);
        asyncResult.asyncContext.completed({
          allowEvent: false,
        });
        return;
      }
      const dialog = asyncResult.value;
      dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        const messageFromDialog = JSON.parse(arg.message);
        console.debug(messageFromDialog);
        if (messageFromDialog.status == "ready") {
          const messageToDialog = JSON.stringify(data);
          dialog.messageChild(messageToDialog);
        } else {
          dialog.close();
          const allowEvent = messageFromDialog.status === "ok";
          if (allowEvent && data.mailId) {
            sessionStorage.removeItem(data.mailId);
          }
          asyncResult.asyncContext.completed({ allowEvent });
        }
      });
      dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
        if (arg.error === 12006) {
          // Closed with the up-right "X" button.
          asyncResult.asyncContext.completed({
            allowEvent: false,
          });
        }
      });
    }
  );
}
window.onItemSend = onItemSend;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onNewMessageComposeCreated(event) {
  const [to, cc, bcc, mailId] = await Promise.all([getToAsync(), getCcAsync(), getBccAsync(), getMailIdAsync()]);
  if (mailId && (to.length > 0 || cc.length > 0 || bcc.length > 0)) {
    const originalRecipients = {
      to,
      cc,
      bcc,
    };
    const id = `${ORIGINAL_RECIPIENTS_KEY_PREFIX}_${mailId}`;
    sessionStorage.setItem(id, JSON.stringify(originalRecipients));
  }
  event.completed();
}
window.onNewMessageComposeCreated = onNewMessageComposeCreated;
