/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2026 ClearCode Inc.
*/
import { L10n } from "./l10n.mjs";

// Base class of reconfirmations which show a list of targets with a message
// before and after it. A subclass must implement collectTargets() and
// defaultMessageBefore.
export class ReconfirmationBase {
  needToReconfirm = false;
  initialized = false;
  locale = "jp";
  ready = null;
  itemType = Office.MailboxEnums.ItemType.Message;
  // Targets to be listed with the default message.
  targets = new Set();
  // Targets with custom messages: Map of message => Set of targets.
  targetsByMessage = new Map();

  constructor(language) {
    this.locale = L10n.get(language);
    this.ready = this.locale.ready;
  }

  init(data) {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.itemType = data.itemType;
    this.collectTargets(data);
    this.needToReconfirm = this.targets.size > 0 || this.targetsByMessage.size > 0;
  }

  // Collect targets to be listed from the data, with addTarget() and
  // addTargetWithMessage().
  collectTargets() {}

  // The message shown before the list of the targets without any custom
  // message. It is a getter because it must be resolved after the locale
  // becomes ready.
  get defaultMessageBefore() {
    return "";
  }

  addTarget(target) {
    this.targets.add(target);
  }

  addTargetWithMessage(target, message) {
    if (!this.targetsByMessage.has(message)) {
      this.targetsByMessage.set(message, new Set());
    }
    this.targetsByMessage.get(message).add(target);
  }

  generateReconfirmationContentElements() {
    const contentElements = [];
    if (this.targets.size > 0) {
      contentElements.push(this.generateContentElement(this.defaultMessageBefore, this.targets));
    }
    for (const [messageBefore, targets] of this.targetsByMessage) {
      contentElements.push(this.generateContentElement(messageBefore, targets));
    }
    return contentElements;
  }

  generateContentElement(messageBefore, targets) {
    const messageBeforeElement = document.createElement("p");
    const listElement = document.createElement("ul");
    listElement.classList.add("reconfirmation-list");
    const messageAfterElement = document.createElement("p");
    for (const target of targets) {
      const itemElement = document.createElement("li");
      const strongElement = document.createElement("strong");
      strongElement.textContent = target;
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

// Base class of reconfirmations for recipients matched to the "REWARNING"
// section of the unsafe domains config.
export class RewarningRecipientsReconfirmationBase extends ReconfirmationBase {
  // "preferredTarget" is the domain or the address of the recipient, and the
  // display name is listed instead when it is unavailable.
  addRecipient(recipient, preferredTarget) {
    const target = preferredTarget || recipient.displayName || "Unknown";
    if (!recipient.rewarningMessage) {
      this.addTarget(target);
      return;
    }
    // The custom message can be a message ID defined in locales or custom-locales.
    // If it is not a message ID, L10n returns it with placeholders replaced.
    this.addTargetWithMessage(
      target,
      this.locale.get(recipient.rewarningMessage, {
        domain: recipient.domain.toLowerCase(),
        address: recipient.address,
      })
    );
  }
}
