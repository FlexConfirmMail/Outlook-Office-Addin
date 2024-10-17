/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import "./l10n.mjs";
import { L10n } from "../../src/web/l10n.mjs";
import { assert } from "tiny-esm-test-runner";
const { is } = assert;

let l10n;

export async function setUp() {
  L10n.clearCache();
  L10n.baseUrl = (new URL(`${import.meta.url}/../../fixtures/`)).toString();
  l10n = new L10n("ja-JP");
  await l10n.ready;
}

test_get.parameters = {
  effective: {
    key: "effectiveMessage",
    expected: "JP：意味ある内容を含むメッセージ",
  },
  blank: {
    key: "blankMessage",
    expected: "",
  },
  withPlaceholders: {
    key: "messageWithPlaceholders",
    params: {
      one: "One",
      two: "Two",
    },
    expected: "JP：プレースホルダーを含むメッセージ：One, Two, ${three}",
  },
  fallbackToGeneralLocale: {
    key: "missingFallbackMessage",
    expected: "フォールバック先で定義されているメッセージ",
  },
  fallbackToDefaultLocale: {
    key: "missingMessage",
    expected: "Message not defined in non-default locales",
  },
};
export function test_get({ key, params, expected }) {
  is(expected, l10n.get(key, params || null));
}
