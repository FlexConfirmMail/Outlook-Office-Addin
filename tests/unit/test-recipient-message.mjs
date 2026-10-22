/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  getRecipientLabel,
  getRecipientMessageParams,
} from "../../src/web/recipient-message.mjs";
import * as RecipientParser from "../../src/web/recipient-parser.mjs";
import { assert } from "tiny-esm-test-runner";
const { is } = assert;

function recipient(address, extraProperties = {}) {
  return {
    ...RecipientParser.parse(address),
    ...extraProperties,
  };
}

test_getRecipientLabel.parameters = {
  'address by default': {
    recipient: recipient("aaa@example.com"),
    expected: "aaa@example.com",
  },
  'preferred label': {
    recipient: recipient("aaa@example.com"),
    preferredLabel: "example.com",
    expected: "example.com",
  },
  'display name for a recipient without any address': {
    recipient: recipient("", { displayName: "test-group" }),
    expected: "test-group",
  },
  'display name for a recipient without any domain': {
    recipient: recipient("", { displayName: "test-group" }),
    preferredLabel: "",
    expected: "test-group",
  },
  'unknown for a recipient without any information': {
    recipient: recipient(""),
    expected: "Unknown",
  },
  'unknown for a recipient with a blank display name': {
    recipient: recipient("", { displayName: "" }),
    expected: "Unknown",
  },
};
export function test_getRecipientLabel({ recipient, preferredLabel, expected }) {
  is(
    expected,
    preferredLabel === undefined
      ? getRecipientLabel(recipient)
      : getRecipientLabel(recipient, preferredLabel)
  );
}

test_getRecipientMessageParams.parameters = {
  'address and domain': {
    recipient: recipient("aaa@example.com"),
    expected: { domain: "example.com", address: "aaa@example.com" },
  },
  // The domain must be lower-cased, but the address must be kept as it is.
  'domain must be lower-cased': {
    recipient: recipient("AAA@EXAMPLE.com"),
    expected: { domain: "example.com", address: "AAA@EXAMPLE.com" },
  },
  'recipient without any address': {
    recipient: recipient("", { displayName: "test-group" }),
    expected: { domain: "", address: "" },
  },
};
export function test_getRecipientMessageParams({ recipient, expected }) {
  is(expected, getRecipientMessageParams(recipient));
}
