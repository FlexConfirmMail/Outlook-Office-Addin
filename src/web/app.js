Office.initialize = reason => {
  console.debug("Office.initialize reasion = ", reason);
};

function toArray(str) {
  if (!str) {
    return null;
  }
  const resultList = [];
  str = str.trim();
  for (let item of str.split("\n")) {
    item = item.trim();
    if (item.length <= 0) {
      continue;
    }
    resultList.push(item);
  }
  return resultList;
}

async function loadFile(url) {
  console.debug("loadFile ", url);
  try {
    const response = await fetch(url);
    const data = await response.text();
    console.debug(data);
    return data;
  } catch (err) {
    console.error(err);
  }
}

function getBccAsync() {
  return new Promise((resolve, reject) => {
    try {
      Office.context.mailbox.item.bcc.getAsync(asyncResult => {
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
      Office.context.mailbox.item.cc.getAsync(asyncResult => {
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
      Office.context.mailbox.item.to.getAsync(asyncResult => {
        resolve(asyncResult.value);
      });
    } catch (error) {
      console.log(`Error while getting To: ${error}`);
      reject(error);
    }
  });
}

async function getAllData() {
  const [to, cc, bcc, trustedString, untrustedString, attachmentsString] = await Promise.all([
    getToAsync(),
    getCcAsync(),
    getBccAsync(),
    loadFile("configs/trusted.txt"),
    loadFile("configs/untrusted.txt"),
    loadFile("configs/attachment.txt"),
  ]);
  const trustedDomains = toArray(trustedString);
  const untrustedDomains = toArray(untrustedString);
  const attachments = toArray(attachmentsString);
  return {
    target: {
      to,
      cc,
      bcc,
    },
    config: {
      trustedDomains,
      untrustedDomains,
      attachments,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onMessageSend(event) {
  console.debug("onMessageSend ", event);
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
    asyncResult => {
      const dialog = asyncResult.value;
      dialog.addEventHandler(Office.EventType.DialogMessageReceived, arg => {
        const messageFromDialog = JSON.parse(arg.message);
        console.debug(messageFromDialog);
        if (messageFromDialog.status == "ready") {
          const messageToDialog = JSON.stringify(data);
          dialog.messageChild(messageToDialog);
        } else {
          dialog.close();
          const allowEvent = messageFromDialog.status === "ok";
          asyncResult.asyncContext.completed({ allowEvent: allowEvent });
        }
      });
    }
  );
}
window.onMessageSend = onMessageSend;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onNewMessageComposeCreated(event) {
  console.debug("onNewMessageComposeCreated ", event);
  Office.context.mailbox.item.subject.setAsync("新規メールの件名", asyncResult => {
    if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
      console.log("件名が設定されました");
    } else {
      console.error("件名の設定に失敗しました: " + asyncResult.error.message);
    }
  });
  event.completed();
}
window.onNewMessageComposeCreated = onNewMessageComposeCreated;
