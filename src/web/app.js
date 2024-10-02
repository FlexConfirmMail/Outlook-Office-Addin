const data = {
  target: {
    to: null,
    cc: null,
    bcc: null,
  },
  config: {
    trustedDomains: null,
    untrustedDomains: null,
    attachments: null,
  },
};

Office.initialize = function (reason) {
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
  return new Promise(function (resolve, reject) {
    try {
      Office.context.mailbox.item.bcc.getAsync(function (asyncResult) {
        resolve(asyncResult.value);
      });
    }
    catch (error) {
      console.log(`Error while getting Bcc: ${asyncResult.error.message}`);
      reject(asyncResult.error);
    }
  })
}

function getCcAsync() {
  return new Promise(function (resolve, reject) {
    try {
      Office.context.mailbox.item.cc.getAsync(function (asyncResult) {
        resolve(asyncResult.value);
      });
    }
    catch (error) {
      console.log(`Error while getting Cc: ${asyncResult.error.message}`);
      reject(asyncResult.error);
    }
  })
}

function getToAsync() {
  return new Promise(function (resolve, reject) {
    try {
      Office.context.mailbox.item.to.getAsync(function (asyncResult) {
        resolve(asyncResult.value);
      });
    }
    catch (error) {
      console.log(`Error while getting To: ${asyncResult.error.message}`);
      reject(asyncResult.error);
    }
  })
}

async function getAllData() {
  const to = await getToAsync();
  const cc = await getCcAsync();
  const bcc = await getBccAsync();
  const trustedString = await loadFile("configs/trusted.txt");
  const untrustedString = await loadFile("configs/untrusted.txt");
  const attachmentsString = await loadFile("configs/attachment.txt");
  const trusted = toArray(trustedString);
  const untrusted = toArray(untrustedString);
  const attachments = toArray(attachmentsString);
  return {
    target: {
      to: to,
      cc: cc,
      bcc: bcc,
    },
    config: {
      trustedDomains: trusted,
      untrustedDomains: untrusted,
      attachments: attachments,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onMessageSend(event) {
  console.debug("onMessageSend ", event);
  const data = await getAllData();
  console.log(data);
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
    function (asyncResult) {
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
  Office.context.mailbox.item.subject.setAsync("新規メールの件名", function (asyncResult) {
    if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
      console.log("件名が設定されました");
    } else {
      console.error("件名の設定に失敗しました: " + asyncResult.error.message);
    }
  });
  event.completed();
}
window.onNewMessageComposeCreated = onNewMessageComposeCreated;
