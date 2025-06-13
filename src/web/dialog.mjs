/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
"use strict";

export function resizeToContent() {
  const range = document.createRange();
  const element = document.querySelector(".dialog-body");
  range.selectNodeContents(element);
  const contentsRect = range.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  const marginTop = parseFloat(styles.marginTop) || 0;
  const marginBottom = parseFloat(styles.marginBottom) || 0;

  const widthDelta = contentsRect.width - window.innerWidth;
  const heightDelta = contentsRect.height + marginTop + marginBottom - window.innerHeight;
  window.resizeBy(Math.min(0, widthDelta), Math.min(0, heightDelta));
  document.documentElement.style.width = "100%";
  document.documentElement.style.height = "100%";
  document.body.style.width = "100%";
  document.body.style.height = "100%";
}
