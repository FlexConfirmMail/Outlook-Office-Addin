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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Office.initialize = function (reason) {};

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
  try {
    const response = await fetch(url);
    const data = await response.text();
    console.debug(data);
    return data;
  } catch (err) {
    console.error(err);
  }
}

function getBcc(callback) {
  Office.context.mailbox.item.bcc.getAsync((asyncResult) => {
    if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
      data.target.bcc = asyncResult.value;
      callback();
    } else {
      console.error(asyncResult.error);
    }
  });
}

function getCc(callback) {
  Office.context.mailbox.item.cc.getAsync((asyncResult) => {
    if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
      data.target.cc = asyncResult.value;
      callback();
    } else {
      console.error(asyncResult.error);
    }
  });
}

function getTo(callback) {
  Office.context.mailbox.item.to.getAsync((asyncResult) => {
    if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
      data.target.to = asyncResult.value;
      callback();
    } else {
      console.error(asyncResult.error);
    }
  });
}

function getAllRecipients(callback) {
  getTo(function () {
    getCc(function () {
      getBcc(callback);
    });
  });
}

function getConfigs(callback) {
  loadFile("configs/trusted.txt").then((items) => {
    data.config.trustedDomains = toArray(items);
    loadFile("configs/attachment.txt").then((items) => {
      data.config.attachments = toArray(items);
      callback();
    });
  });
}

function getAllData(callback) {
  getAllRecipients(function () {
    getConfigs(callback);
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onMessageSend(event) {
  getAllData(function () {
    Office.context.ui.displayDialogAsync(
      window.location.origin + "/dialog.html",
      { 
        asyncContext: event, 
        height: 60,
        width: 60,
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
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onNewMessageComposeCreated(event) {
  Office.context.mailbox.item.subject.setAsync("新規メールの件名", function (asyncResult) {
    if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
      console.log("件名が設定されました");
    } else {
      console.error("件名の設定に失敗しました: " + asyncResult.error.message);
    }
  });
  event.completed();
}
