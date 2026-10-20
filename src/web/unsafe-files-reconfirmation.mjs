/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { L10n } from "./l10n.mjs";

export class UnsafeFilesReconfirmation {
  needToReconfirm = false;
  rewarningFiles = new Set();
  // Files with custom messages: Map of message => Set of file names.
  rewarningFilesByMessage = new Map();
  initialized = false;
  locale = "jp";
  ready = null;

  constructor(language) {
    this.locale = L10n.get(language);
    this.ready = this.locale.ready;
  }

  init(data) {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    for (const attachment of data.classified.attachments.rewarning) {
      if (!attachment.rewarningMessage) {
        this.rewarningFiles.add(attachment.name);
        continue;
      }
      // The custom message can be a message ID defined in locales or custom-locales.
      // If it is not a message ID, L10n returns it with placeholders replaced.
      const message = this.locale.get(attachment.rewarningMessage, { name: attachment.name });
      if (!this.rewarningFilesByMessage.has(message)) {
        this.rewarningFilesByMessage.set(message, new Set());
      }
      this.rewarningFilesByMessage.get(message).add(attachment.name);
    }
    this.needToReconfirm = this.rewarningFiles.size > 0 || this.rewarningFilesByMessage.size > 0;
  }

  generateReconfirmationContentElements() {
    const contentElements = [];
    if (this.rewarningFiles.size > 0) {
      contentElements.push(
        this.generateContentElement(
          this.locale.get("Reconfirmation_unsafeFiles"),
          this.rewarningFiles
        )
      );
    }
    for (const [message, files] of this.rewarningFilesByMessage) {
      contentElements.push(this.generateContentElement(message, files));
    }
    return contentElements;
  }

  generateContentElement(messageBefore, files) {
    const messageBeforeElement = document.createElement("p");
    const listElement = document.createElement("ul");
    listElement.classList.add("reconfirmation-list");
    const messageAfterElement = document.createElement("p");
    for (const file of files) {
      const itemElement = document.createElement("li");
      const strongElement = document.createElement("strong");
      strongElement.textContent = file;
      itemElement.appendChild(strongElement);
      listElement.appendChild(itemElement);
    }
    messageBeforeElement.textContent = messageBefore;
    messageAfterElement.textContent = this.locale.get("Reconfirmation_confirmToSend");
    const contentElement = document.createElement("div");
    contentElement.appendChild(messageBeforeElement);
    contentElement.appendChild(listElement);
    contentElement.appendChild(messageAfterElement);
    return contentElement;
  }
}
