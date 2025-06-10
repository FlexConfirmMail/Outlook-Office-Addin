/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
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

Office.actions.associate("onNewMessageComposeCreated", onNewMessageComposeCreated);
Office.actions.associate("onAppointmentOrganizer", onAppointmentOrganizer);