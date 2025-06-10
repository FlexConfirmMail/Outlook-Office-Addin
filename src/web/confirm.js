/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { L10n } from "./l10n.mjs";
import { SafeBccConfirmation } from "./safe-bcc-confirmation.mjs";
import { AddedDomainsReconfirmation } from "./added-domains-reconfirmation.mjs";
import { AttachmentsConfirmation } from "./attachments-confirmation.mjs";
import * as Dialog from "./dialog.mjs";

let l10n;
let safeBccConfirmation;
let attachmentsConfirmation;
const addedDomainsReconfirmation = new AddedDomainsReconfirmation();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Office.initialize = (_reason) => {};

Office.onReady(() => {
  const language = Office.context.displayLanguage;
  l10n = L10n.get(language);
  l10n.ready.then(() => l10n.translateAll());
  safeBccConfirmation = new SafeBccConfirmation(language);
  attachmentsConfirmation = new AttachmentsConfirmation(language);

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
  if (addedDomainsReconfirmation.needToConfirm) {
    addedDomainsReconfirmation.show();
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
      const label = `${recipient.type}: ${recipient.address}`;
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
  const data = JSON.parse(arg.message);

  // The data scheme:
  // data = {
  //   target: {
  //     to : [{emailAddress:"mail@example.com"}, ...],
  //     cc : [...],
  //     bcc : [...],
  //     requiredAttendees : [...],
  //     optionalAttendees : [...],
  //     attachments: [{name:"...",size:0,isInline:false}, ...],
  //   },
  //   config: {
  //     trustedDomains : ["example.com", ...],
  //     unsafeDomains : [...],
  //     unsafeFiles : [...],
  //   },
  //   originalRecipients: {
  //     to : [...],
  //     cc : [...],
  //     bcc : [...],
  //   },
  //   classified: {
  //     trusted: [...],
  //     untrusted: [...],
  //     unsafeWithDomain: [...],
  //     unsafe: [...],
  //   },
  //   itemType: Office.MailboxEnums.ItemType.Message,
  // }

  console.log(data);
  await Promise.all([l10n.ready, safeBccConfirmation.loaded, attachmentsConfirmation.loaded]);

  if (data.classified.trusted.length == 0) {
    document.getElementById("check-all-trusted").disabled = true;
  }
  const groupedByTypeTrusteds = Object.groupBy(data.classified.trusted, (item) => item.domain);
  appendRecipientCheckboxes(document.getElementById("trusted-domains"), groupedByTypeTrusteds);
  const groupedByTypeUntrusted = Object.groupBy(data.classified.untrusted, (item) => item.domain);
  appendRecipientCheckboxes(document.getElementById("untrusted-domains"), groupedByTypeUntrusted);

  safeBccConfirmation.init(data);
  appendMiscWarningCheckboxes(safeBccConfirmation.warningConfirmationItems);

  appendMiscWarningCheckboxes(
    Array.from(
      new Set(data.classified.unsafeWithDomain.map((recipient) => recipient.domain.toLowerCase())),
      (domain) => l10n.get("confirmation_unsafeDomainRecipientCheckboxLabel", { domain })
    )
  );
  appendMiscWarningCheckboxes(
    data.classified.unsafe.map((recipient) =>
      l10n.get("confirmation_unsafeRecipientCheckboxLabel", { address: recipient.address })
    )
  );

  Dialog.resizeToContent();

  addedDomainsReconfirmation.init(data);
  addedDomainsReconfirmation.initUI(sendStatusToParent);

  attachmentsConfirmation.init(data);
  appendMiscWarningCheckboxes(attachmentsConfirmation.warningConfirmationItems);
  appendMiscCheckboxes(attachmentsConfirmation.confirmationItems);

  const newlyAddedDomainsBeforeMessage =
    data.itemType === Office.MailboxEnums.ItemType.Message
      ? l10n.get("newlyAddedDomainReconfirmation_messageBefore")
      : l10n.get("newlyAddedDomainReconfirmation_messageBeforeForAppointment");
  document.getElementById("newly-added-domains-message-before").textContent =
    newlyAddedDomainsBeforeMessage;
}
