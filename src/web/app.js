const ORIGINAL_RECIPIENTS_KEY_PREFIX = "FCM_OriginalRecipients";

Office.initialize = (reason) => {
  console.debug("Office.initialize reasion = ", reason);
};

class ConfigLoader {
  static commonParamDefs = {
    CountEnabled: "boolean",
    CountAllowSkip: "boolean",
    SafeBccEnabled: "boolean",
    MainSkipIfNoExt: "boolean",
    SafeNewDomainsEnabled: "boolean",
    CountSeconds: "number",
    SafeBccThreshold: "number",
  };

  static assignCommonConfig(config, paramDefs, key, valStr) {
    if (!(key in paramDefs)) {
      return false;
    }
    const keyType = paramDefs[key];
    if (keyType === "boolean") {
      const perseResult = this.parseBool(valStr);
      if (perseResult != null) {
        config[key] = perseResult;
        return true;
      }
    } else if (keyType === "number") {
      const perseResult = parseInt(valStr, 10);
      if (!isNaN(perseResult)) {
        config[key] = perseResult;
        return true;
      }
    }
    return false;
  }

  static parseBool(str) {
    const lowerStr = str.toLowerCase();
    if (lowerStr === "yes" || lowerStr === "true" || lowerStr === "on" || lowerStr === "1") {
      return true;
    }
    if (lowerStr === "no" || lowerStr === "false" || lowerStr === "off" || lowerStr === "0") {
      return false;
    }
    return null;
  }

  static toArray(str) {
    if (!str) {
      return null;
    }
    const resultList = [];
    str = str.trim();
    for (let item of str.split("\n")) {
      item = item.trim();
      if (item.length <= 0 || item[0] === "#") {
        continue;
      }
      resultList.push(item);
    }
    return resultList;
  }

  static toDictionary(str, paramDefs) {
    if (!str) {
      return null;
    }
    const resultDictionary = {};
    str = str.trim();
    for (let item of str.split("\n")) {
      item = item.trim();
      if (item.length <= 0 || item[0] === "#") {
        continue;
      }
      const separaterIndex = item.indexOf("=");
      if (separaterIndex === -1) {
        continue;
      }
      const key = item.slice(0, separaterIndex).trim();
      const value = item.slice(separaterIndex + 1).trim();
      this.assignCommonConfig(resultDictionary, paramDefs, key, value);
    }
    return resultDictionary;
  }

  static async loadFile(url) {
    console.debug("loadFile ", url);
    try {
      const response = await fetch(url);
      const data = await response.text();
      console.debug(data);
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  static async load() {
    const [trustedString, untrustedString, attachmentsString, commonString] = await Promise.all([
      this.loadFile("configs/trusted.txt"),
      this.loadFile("configs/untrusted.txt"),
      this.loadFile("configs/attachment.txt"),
      this.loadFile("configs/common.txt"),
    ]);
    const trustedDomains = this.toArray(trustedString);
    const untrustedDomains = this.toArray(untrustedString);
    const attachments = this.toArray(attachmentsString);
    const common = this.toDictionary(commonString, this.commonParamDefs);
    return {
      trustedDomains,
      untrustedDomains,
      attachments,
      common,
    };
  }
}

function getBccAsync() {
  return new Promise((resolve, reject) => {
    try {
      Office.context.mailbox.item.bcc.getAsync((asyncResult) => {
        resolve(asyncResult.value);
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
        resolve(asyncResult.value);
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
        resolve(asyncResult.value);
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

async function getAllData() {
  const [to, cc, bcc, mailId, config] = await Promise.all([
    getToAsync(),
    getCcAsync(),
    getBccAsync(),
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
          asyncResult.asyncContext.completed({ allowEvent: allowEvent });
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
  const [to, cc, bcc, mailId] = await Promise.all([
    getToAsync(),
    getCcAsync(),
    getBccAsync(),
    getMailIdAsync()]);
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
