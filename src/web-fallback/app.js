Office.onReady(() => {});

async function onItemSend(event) {
  event.completed({ allowEvent: true });
}
window.onItemSend = onItemSend;

async function onNewMessageComposeCreated(event) {
  event.completed();
}
window.onNewMessageComposeCreated = onNewMessageComposeCreated;

async function onAppointmentOrganizer(event) {
  event.completed();
}
window.onAppointmentOrganizer = onAppointmentOrganizer;

async function onOpenSettingDialog(event) {
  event.completed({ allowEvent: true });
}
window.onOpenSettingDialog = onOpenSettingDialog;
