/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2026 ClearCode Inc.
*/
"use strict";

// The label of the recipient listed in dialogs.
// "preferredLabel" is the domain or the address of the recipient, and the
// display name is listed instead when it is unavailable: for example an
// unexpanded distribution list has no address and no domain.
export function getRecipientLabel(recipient, preferredLabel = recipient.address) {
  return preferredLabel || recipient.displayName || "Unknown";
}

// The parameters for the placeholders in a message. They are available both
// for the messages defined in locales and for the custom messages written in
// the unsafe domains config.
export function getRecipientMessageParams(recipient) {
  return {
    domain: recipient.domain.toLowerCase(),
    address: recipient.address,
  };
}
