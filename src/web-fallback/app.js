Office.onReady(() => {});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onItemSend(event) {
  event.completed({ allowEvent: true });
}
window.onItemSend = onItemSend;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onNewMessageComposeCreated(event) {
  event.completed();
}
window.onNewMessageComposeCreated = onNewMessageComposeCreated;

async function onAppointmentOrganizer(event) {
  event.completed();
}
window.onAppointmentOrganizer = onAppointmentOrganizer;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onOpenSettingDialog(event) {
  event.completed({ allowEvent: true });
}
window.onOpenSettingDialog = onOpenSettingDialog;
