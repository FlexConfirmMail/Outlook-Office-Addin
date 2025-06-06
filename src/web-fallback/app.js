Office.onReady(() => {});

async function onItemSend(event) {
  event.completed({ allowEvent: true });
}
window.onItemSend = onItemSend;

async function onNewMessageComposeCreated(event) {
  event.completed();
}
window.onNewMessageComposeCreated = onNewMessageComposeCreated;

async function onOpenSettingDialog(event) {
  event.completed({ allowEvent: true });
}
window.onOpenSettingDialog = onOpenSettingDialog;
