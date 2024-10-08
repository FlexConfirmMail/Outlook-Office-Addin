// eslint-disable-next-line @typescript-eslint/no-unused-vars
Office.initialize = (reason) => {};

Office.onReady(() => {
  Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, onMessageFromParent);
  sendStatusToParent("ready");
});

function sendStatusToParent(status) {
  const messageObject = { status: status };
  const jsonMessage = JSON.stringify(messageObject);
  Office.context.ui.messageParent(jsonMessage);
}

window.onSend = () => {
  sendStatusToParent("skip");
};

window.onCancel = () => {
  sendStatusToParent("cancel");
};

function onMessageFromParent(arg) {
  const data = JSON.parse(arg.message);

  console.log(data);

  if (!data.config.common.CountAllowSkip) {
    console.log("cannot skip");
    $("#send-button").hide();
  }

  $("#count").text(data.config.common.CountSeconds);
  $("#message").show();

  const start = Date.now();
  const timer = window.setInterval(() => {
    const rest = Math.ceil(data.config.common.CountSeconds - (Date.now() - start) / 1000);
    console.log("rest: ", rest);
    $("#count").text(rest);
    if (rest > 0) {
      return;
    }
    window.clearInterval(timer);
    try {
      sendStatusToParent("done");
    } catch (error) {
      console.log("failed to accept countdown dialog: ", error);
    }
  }, 250);
}
