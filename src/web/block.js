/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { L10n } from "./l10n.mjs";
import * as Dialog from "./dialog.mjs";

let l10n;
const warningContents = [];

Office.onReady(() => {
  if (window !== window.parent) {
    // Inframe mode
    document.documentElement.classList.add("in-frame");
  }
  const language = Office.context.displayLanguage;
  l10n = L10n.get(language);
  l10n.ready.then(() => l10n.translateAll());

  document.documentElement.setAttribute("lang", language);

  Office.context.ui.addHandlerAsync(
    Office.EventType.DialogParentMessageReceived,
    onMessageFromParent
  );
  sendStatusToParent("ready");
});

function sendStatusToParent(status) {
  const messageObject = { status: status };
  const jsonMessage = JSON.stringify(messageObject);
  Office.context.ui.messageParent(jsonMessage);
}

window.onOK = () => {
  if (warningContents.length > 0) {
    showNextWarning();
  } else {
    sendStatusToParent("ok");
  }
};

function showNextWarning() {
  if (warningContents.length == 0) {
    return;
  }
  const content = warningContents.shift();
  const dialogBody = document.getElementById("dialog-body");
  dialogBody.hidden = true;
  const targetElement = document.getElementById("block-list");
  targetElement.innerHTML = "";
  for (const target of content.targets) {
    const itemElement = document.createElement("li");
    const strongElement = document.createElement("strong");
    strongElement.textContent = target;
    itemElement.appendChild(strongElement);
    targetElement.appendChild(itemElement);
  }
  document.getElementById("block-message-before").textContent = content.messageBefore;
  document.getElementById("block-message-after").textContent = content.messageAfter;
  Dialog.resizeToContent();
  dialogBody.hidden = false;
}

async function onMessageFromParent(arg) {
  const data = JSON.parse(arg.message);
  console.log(data);
  await l10n.ready;

  const recipients = [
    ...data.classified.recipients.block,
    ...data.classified.recipients.blockWithDomain,
  ];
  const distributionListTypeRecipients = data.classified.recipients.distributionLists;
  const attachments = data.classified.attachments.block;
  const bodyMatchedWords = data.bodyBlockTargetWords;
  if (recipients.length > 0) {
    const targets = new Set();
    for (const recipient of recipients) {
      let target = recipient.address;
      if (!target || target === "") {
        target = recipient.displayName;
      }
      if (!target || target === "") {
        target = "Unknown";
      }
      targets.add(`${recipient.type}: ${target}`);
    }
    const messageBefore =
      data.itemType == Office.MailboxEnums.ItemType.Message
        ? l10n.get("block_messageBeforeForMailRecipients")
        : l10n.get("block_messageBeforeForAppointmentRecipients");
    const messageAfter = l10n.get("block_messageAfterForRecipients");
    warningContents.push({ targets, messageBefore, messageAfter });
  }
  if (distributionListTypeRecipients.length > 0) {
    const targets = new Set();
    for (const recipient of distributionListTypeRecipients) {
      let target = recipient.displayName;
      if (!target || target === "") {
        target = "Unknown";
      }
      targets.add(`${recipient.type}: ${target}`);
    }
    const messageBefore =
      data.itemType == Office.MailboxEnums.ItemType.Message
        ? l10n.get("block_messageBeforeForMailDistributionLists")
        : l10n.get("block_messageBeforeForAppointmentDistributionLists");
    const messageAfter = l10n.get("block_messageAfterForDistributionLists");
    warningContents.push({ targets, messageBefore, messageAfter });
  }
  if (attachments.length > 0) {
    const targets = attachments.map((attachment) => attachment.name);
    const messageBefore =
      data.itemType == Office.MailboxEnums.ItemType.Message
        ? l10n.get("block_messageBeforeForMailAttachments")
        : l10n.get("block_messageBeforeForAppointmentAttachments");
    const messageAfter = l10n.get("block_messageAfterForAttachments");
    warningContents.push({ targets, messageBefore, messageAfter });
  }
  if (bodyMatchedWords.length > 0) {
    const targets = new Set();
    for (const word of bodyMatchedWords) {
      targets.add(word);
    }
    const messageBefore =
      data.itemType == Office.MailboxEnums.ItemType.Message
        ? l10n.get("block_messageBeforeForMailBodies")
        : l10n.get("block_messageBeforeForAppointmentBodies");
    const messageAfter = l10n.get("block_messageAfterForBodies");
    warningContents.push({ targets, messageBefore, messageAfter });
  }
  showNextWarning();
}
