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

  Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, onMessageFromParent);
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
  const checkTargetLength = $("fluent-checkbox.check-target").length;
  const checkedTargetLength = $("fluent-checkbox.check-target.checked").length;
  const toBeCheckedNumber = $("#trusted-domains fluent-checkbox.check-target").not(".checked").length;
  $("#trusted-domains fluent-checkbox.check-target").prop("checked", true);
  const hasUnchecked = checkTargetLength !== checkedTargetLength + toBeCheckedNumber;
  $("#send-button").prop("disabled", hasUnchecked);
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
  const checkTargetLength = $("fluent-checkbox.check-target").length;
  const checkedTargetLength = $("fluent-checkbox.check-target.checked").length;
  // If the target is currently checked, the target is unchecked after this function and vice versa.
  const adjustmentValue = $(targetElement).hasClass("checked") ? -1 : 1;
  const hasUnchecked = checkTargetLength !== checkedTargetLength + adjustmentValue;
  $("#send-button").prop("disabled", hasUnchecked);
};

function appendRecipientCheckboxes(target, groupedRecipients) {
  for (const [key, recipients] of Object.entries(groupedRecipients)) {
    const idForGroup = generateTempId();
    const idForGroupTitle = generateTempId();
    target.append(`
      <div>
        <h4 id="${idForGroupTitle}"></h4>
        <fluent-stack id=${idForGroup} orientation="vertical" vertical-align="start"></fluent-stack>
      </div>`);
    //In order to escape special chars, adding values with the text function.
    $(`#${idForGroupTitle}`).text(key);
    const container = $(`#${idForGroup}`);
    for (const recipient of recipients) {
      const label = `${recipient.type}: ${recipient.address}`;
      appendCheckbox({ container, label });
    }
  }
}

function appendMiscCheckboxes(items) {
  const container = $("#attachment-and-others");
  for (const item of items) {
    appendCheckbox({
      container,
      label: item.label || item,
    });
  }
}

function appendMiscWarningCheckboxes(items) {
  const container = $("#attachment-and-others");
  for (const item of items) {
    appendCheckbox({
      container,
      label: item.label || item,
      warning: true,
    });
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
  container.append(
    `<fluent-checkbox id="${id}" class="check-target ${[...extraClasses].join(
      " "
    )}" onchange="checkboxChanged(this)"></fluent-checkbox>`
  );
  //In order to escape special chars, adding values with the text function.
  $(`#${id}`).text(label);
}

async function onMessageFromParent(arg) {
  const data = JSON.parse(arg.message);

  // The data scheme:
  // data = {
  //   target: {
  //     to : [{emailAddress:"mail@example.com"}, ...],
  //     cc : [...],
  //     bcc : [...],
  //     attachments: [{name:"...",size:0,isInline:false}, ...],
  //   },
  //   config: {
  //     trustedDomains : ["example.com", ...],
  //     unsafeDomains : [...],
  //     unsafeFiles : [...],
  //   },
  //   mailId: "FCM_OriginalRecipients_0123",
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
  // }

  console.log(data);
  await Promise.all([l10n.ready, safeBccConfirmation.loaded, attachmentsConfirmation.loaded]);

  if (data.classified.trusted.length == 0) {
    $("#check-all-trusted").prop("disabled", true);
  }
  const groupedByTypeTrusteds = Object.groupBy(data.classified.trusted, (item) => item.domain);
  appendRecipientCheckboxes($("#trusted-domains"), groupedByTypeTrusteds);
  const groupedByTypeUntrusted = Object.groupBy(data.classified.untrusted, (item) => item.domain);
  appendRecipientCheckboxes($("#untrusted-domains"), groupedByTypeUntrusted);

  safeBccConfirmation.init(data);
  appendMiscWarningCheckboxes(safeBccConfirmation.warningConfirmationItems);

  appendMiscWarningCheckboxes(
    Array.from(new Set(data.classified.unsafeWithDomain.map((recipient) => recipient.domain.toLowerCase())), (domain) =>
      l10n.get("confirmation_unsafeDomainRecipientCheckboxLabel", { domain })
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
  $("#newly-added-domains-message-before").text(newlyAddedDomainsBeforeMessage);
}
