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

window.onConvert = () => {
  sendStatusToParent("convertBcc");
};

window.onNotConvert = () => {
  sendStatusToParent("notConvertBcc");
};

async function onMessageFromParent(arg) {
  const data = JSON.parse(arg.message);
  console.log(data);
  await l10n.ready;
  const threshold = data.config.common?.ConvertBccThreshold;
  const description = l10n.get("convertToBcc_description", { threshold });
  document.getElementById("convertBcc-description").textContent = description;
}
