/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
export class Reconfirmation {
  needToConfirm = false;
  confirmContents = [];
  currentContensIndex = 0;

  appendContent(content) {
    if (!content) {
      return;
    }
    this.needToConfirm = true;
    this.confirmContents.push(content);
  }

  initUI(sendStatusToParent) {
    window.onOkReconfirmation = () => {
      if (this.showNextContent()) {
        return;
      }
      document.getElementById("reconfirmation-dialog").hidden = true;
      sendStatusToParent("ok");
    };
    window.onCancelReconfirmation = () => {
      this.currentContensIndex = 0;
      document.getElementById("reconfirmation-dialog").hidden = true;
    };
  }

  showNextContent() {
    if (this.currentContensIndex >= this.confirmContents.length) {
      return false;
    }
    const content = this.confirmContents[this.currentContensIndex];
    const targetElement = document.getElementById("reconfirmations-card");
    targetElement.innerHTML = "";
    targetElement.appendChild(content);
    this.currentContensIndex += 1;
    return true;
  }

  show() {
    this.currentContensIndex = 0;
    this.showNextContent();
    document.getElementById("reconfirmation-dialog").hidden = false;
  }
}
