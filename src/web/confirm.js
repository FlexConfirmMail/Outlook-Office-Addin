/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { L10n } from "./l10n.mjs";
import { SafeBccConfirmation } from "./safe-bcc-confirmation.mjs";
import { AddedDomainsReconfirmation } from "./added-domains-reconfirmation.mjs";
import { ConfirmData } from "./confirm-data.mjs";
import { Reconfirmation } from "./reconfirmation.mjs";
import { UnsafeDomainsReconfirmation } from "./unsafe-domains-reconfirmation.mjs";
import { UnsafeAddressesReconfirmation } from "./unsafe-addresses-reconfirmation.mjs";
import { UnsafeFilesReconfirmation } from "./unsafe-files-reconfirmation.mjs";
import { UnsafeBodiesConfirmation } from "./unsafe-bodies-confirmation.mjs";
import * as Dialog from "./dialog.mjs";

let l10n;
let safeBccConfirmation;
let reconfirmation;
let addedDomainsReconfirmation;
let unsafeDomainsReconfirmation;
let unsafeAddressesReconfirmation;
let unsafeFilesReconfirmation;
let unsafeBodiesConfirmation;

Office.onReady(() => {
  if (window !== window.parent) {
    // Inframe mode
    document.documentElement.classList.add("in-frame");
  }
  const language = Office.context.displayLanguage;
  l10n = L10n.get(language);
  l10n.ready.then(() => l10n.translateAll());
  safeBccConfirmation = new SafeBccConfirmation(language);
  reconfirmation = new Reconfirmation();
  addedDomainsReconfirmation = new AddedDomainsReconfirmation(language);
  unsafeDomainsReconfirmation = new UnsafeDomainsReconfirmation(language);
  unsafeAddressesReconfirmation = new UnsafeAddressesReconfirmation(language);
  unsafeFilesReconfirmation = new UnsafeFilesReconfirmation(language);
  unsafeBodiesConfirmation = new UnsafeBodiesConfirmation(language);

  document.documentElement.setAttribute("lang", language);

  Office.context.ui.addHandlerAsync(
    Office.EventType.DialogParentMessageReceived,
    onMessageFromParent
  );
  sendStatusToParent("ready");
});

let counter = 0;
function generateTempId() {
  return `fcm_temp_${counter++}_${Date.now()}`;
}

function sendStatusToParent(status) {
  const messageObject = { status: status };
  const jsonMessage = JSON.stringify(messageObject);
  Office.context.ui.messageParent(jsonMessage);
}

window.onCheckAllTrusted = () => {
  const checkTargetLength = document.querySelectorAll("fluent-checkbox.check-target").length;
  const checkedTargetLength = document.querySelectorAll(
    "fluent-checkbox.check-target.checked"
  ).length;
  const trustedCheckboxes = document.querySelectorAll(
    "#trusted-domains fluent-checkbox.check-target"
  );
  const toBeCheckedNumber = Array.from(trustedCheckboxes).filter(
    (cb) => !cb.classList.contains("checked")
  ).length;
  trustedCheckboxes.forEach((cb) => (cb.checked = true));
  const hasUnchecked = checkTargetLength !== checkedTargetLength + toBeCheckedNumber;
  const sendButton = document.getElementById("send-button");
  sendButton.disabled = hasUnchecked;
};

window.onSend = () => {
  if (reconfirmation.needToConfirm) {
    reconfirmation.show();
  } else {
    sendStatusToParent("ok");
  }
};

window.onCancel = () => {
  sendStatusToParent("cancel");
};

window.checkboxChanged = (targetElement) => {
  const checkTargetLength = document.querySelectorAll("fluent-checkbox.check-target").length;
  const checkedTargetLength = document.querySelectorAll(
    "fluent-checkbox.check-target.checked"
  ).length;
  // If the target is currently checked, the target is unchecked after this function and vice versa.
  const adjustmentValue = targetElement.classList.contains("checked") ? -1 : 1;
  const hasUnchecked = checkTargetLength !== checkedTargetLength + adjustmentValue;
  const sendButton = document.getElementById("send-button");
  sendButton.disabled = hasUnchecked;
};

function appendRecipientCheckboxes(target, groupedRecipients) {
  for (const [key, recipients] of Object.entries(groupedRecipients)) {
    const idForGroup = generateTempId();
    const idForGroupTitle = generateTempId();
    target.insertAdjacentHTML(
      "beforeend",
      `<div>
          <h4 id="${idForGroupTitle}"></h4>
          <fluent-stack id="${idForGroup}" orientation="vertical" vertical-align="start"></fluent-stack>
      </div>`
    );
    //In order to escape special chars, adding values with the text function.
    document.getElementById(idForGroupTitle).textContent = key;
    const container = document.getElementById(idForGroup);
    const createdLabels = new Set();
    for (const recipient of recipients) {
      let target = recipient.address;
      if (!target || target === "") {
        target = recipient.displayName;
      }
      if (!target || target === "") {
        target = "Unknown";
      }
      const label = `${recipient.type}: ${target}`;
      if (createdLabels.has(label)) {
        continue;
      }
      appendCheckbox({ container, label });
      createdLabels.add(label);
    }
  }
}

function appendMiscCheckboxes(items) {
  const container = document.getElementById("attachment-and-others");
  const createdLabels = new Set();
  for (const item of items) {
    const label = item.label || item;
    if (createdLabels.has(label)) {
      continue;
    }
    appendCheckbox({
      container,
      label,
    });
    createdLabels.add(label);
  }
}

function appendMiscWarningCheckboxes(items) {
  const container = document.getElementById("attachment-and-others");
  const createdLabels = new Set();
  for (const item of items) {
    const label = item.label || item;
    if (createdLabels.has(label)) {
      continue;
    }
    appendCheckbox({
      container,
      label,
      warning: true,
    });
    createdLabels.add(label);
  }
}

function appendCheckbox({ container, id, label, warning }) {
  if (!id) {
    id = generateTempId();
  }
  const extraClasses = new Set();
  if (warning) {
    extraClasses.add("warning");
  }
  const checkbox = document.createElement("fluent-checkbox");
  checkbox.id = id;
  checkbox.className = "check-target " + [...extraClasses].join(" ");
  checkbox.setAttribute("onchange", "checkboxChanged(this)");

  //In order to escape special chars, use textContent.
  checkbox.textContent = label;
  container.appendChild(checkbox);
}

async function onMessageFromParent(arg) {
  const receivedData = JSON.parse(arg.message);
  console.log(receivedData);
  const data = new ConfirmData(receivedData);
  await Promise.all([
    l10n.ready,
    safeBccConfirmation.loaded,
    addedDomainsReconfirmation.loaded,
    unsafeDomainsReconfirmation.loaded,
    unsafeAddressesReconfirmation.loaded,
    unsafeFilesReconfirmation.loaded,
    unsafeBodiesConfirmation.loaded,
  ]);

  if (data.classified.recipients.trusted.length == 0) {
    document.getElementById("check-all-trusted").disabled = true;
  }
  const groupedByTypeTrusteds = Object.groupBy(
    data.classified.recipients.trusted,
    (item) => item.domain
  );
  appendRecipientCheckboxes(document.getElementById("trusted-domains"), groupedByTypeTrusteds);
  const groupedByTypeUntrusted = Object.groupBy(
    data.classified.recipients.untrusted,
    (item) => item.domain
  );
  appendRecipientCheckboxes(document.getElementById("untrusted-domains"), groupedByTypeUntrusted);

  if (data.config.common.RequireCheckSubject) {
    const mailSubject = document.getElementById("mail-subject");
    mailSubject.textContent = data.target.subject;
    document.getElementById("mail-subject-checkbox").checked = false;
    document.getElementById("mail-subject-card").hidden = false;
  }

  if (data.config.common.RequireCheckBody) {
    const mailBody = document.getElementById("mail-body");
    const sanitizedBody = DOMPurify.sanitize(data.target.body);
    mailBody.insertAdjacentHTML("beforeend", sanitizedBody);
    document.getElementById("mail-body-checkbox").checked = false;
    document.getElementById("mail-body-card").hidden = false;
  }

  safeBccConfirmation.init(data);
  appendMiscWarningCheckboxes(safeBccConfirmation.warningConfirmationItems);

  unsafeBodiesConfirmation.init(data);
  appendMiscWarningCheckboxes(unsafeBodiesConfirmation.warningConfirmationItems);

  appendMiscWarningCheckboxes(
    Array.from(
      new Set(
        data.classified.recipients.unsafeWithDomain.map((recipient) =>
          recipient.domain.toLowerCase()
        )
      ),
      (domain) => l10n.get("confirmation_unsafeDomainRecipientCheckboxLabel", { domain })
    )
  );
  appendMiscWarningCheckboxes(
    data.classified.recipients.unsafe.map((recipient) =>
      l10n.get("confirmation_unsafeRecipientCheckboxLabel", { address: recipient.address })
    )
  );

  const attachmentWarningLabels = data.classified.attachments.unsafe.map((attachment) =>
    l10n.get("confirmation_unsafeAttachmentCheckboxLabel", { name: attachment.name })
  );
  const attachmentLabels =
    data.target.attachments?.map((attachment) =>
      l10n.get("confirmation_attachmentCheckboxLabel", { name: attachment.name })
    ) || [];
  appendMiscWarningCheckboxes(attachmentWarningLabels);
  appendMiscCheckboxes(attachmentLabels);

  reconfirmation.initUI(sendStatusToParent);
  for (const reconfirmationChecker of [
    addedDomainsReconfirmation,
    unsafeDomainsReconfirmation,
    unsafeAddressesReconfirmation,
    unsafeFilesReconfirmation,
    unsafeBodiesConfirmation,
    safeBccConfirmation,
  ]) {
    reconfirmationChecker.init(data);
    if (!reconfirmationChecker.needToReconfirm) {
      continue;
    }
    for (const content of reconfirmationChecker.generateReconfirmationContentElements()) {
      reconfirmation.appendContent(content);
    }
  }
  Dialog.resizeToContent();
}
