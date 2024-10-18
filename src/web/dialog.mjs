/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
"use strict";

export function resizeToContent() {
  const range = document.createRange();
  range.selectNodeContents(document.querySelector('.card-container'));
  const contentsRect = range.getBoundingClientRect();

  const widthDelta = contentsRect.width - window.innerWidth;
  const heightDelta = contentsRect.height - window.innerHeight;
  window.resizeBy(Math.min(0, widthDelta), Math.min(0, heightDelta));
}
