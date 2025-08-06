/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { L10n } from "./l10n.mjs";
import * as Dialog from "./dialog.mjs";

let l10n;

Office.onReady(() => {
  if (window !== window.parent) {
    // Inframe mode
    document.documentElement.classList.add('in-frame');
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

window.onSend = () => {
  sendStatusToParent("skip");
};

window.onCancel = () => {
  sendStatusToParent("cancel");
};

async function onMessageFromParent(arg) {
  const data = JSON.parse(arg.message);

  console.log(data);
  await l10n.ready;

  if (!data.config.common.CountAllowSkip) {
    console.log("cannot skip");
    document.getElementById("send-button").style.display = "none";
  }

  document.getElementById("count").textContent = data.config.common.CountSeconds;
  document.getElementById("message").style.display = "inline";

  Dialog.resizeToContent();

  const start = Date.now();
  const timer = window.setInterval(() => {
    const rest = Math.ceil(data.config.common.CountSeconds - (Date.now() - start) / 1000);
    console.log("rest: ", rest);
    document.getElementById("count").textContent = rest;
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
