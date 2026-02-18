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

async function prepare(language) {
  L10n.clearCache();
  L10n.baseUrl = (new URL(`${import.meta.url}/../../fixtures/`)).toString();
  const l10n = new L10n(language);
  await l10n.ready;
  return l10n;
}

test_get.parameters = {
  effective: {
    language: "ja-JP",
    key: "effectiveMessage",
    expected: "JP：意味ある内容を含むメッセージ",
  },
  blank: {
    language: "ja-JP",
    key: "blankMessage",
    expected: "",
  },
  withPlaceholders: {
    language: "ja-JP",
    key: "messageWithPlaceholders",
    params: {
      one: "One",
      two: "Two",
    },
    expected: "JP：プレースホルダーを含むメッセージ：One, Two, ${three}",
  },
  fallbackToGeneralLocale: {
    language: "ja-JP",
    key: "missingFallbackMessage",
    expected: "フォールバック先で定義されているメッセージ",
  },
  customLocaleOverride: {
    language: "ja-JP",
    key: "customOverrideMessage",
    expected: "JP：カスタムロケールの上書きメッセージ",
  },
  customLocaleOverride: {
    language: "ja-JP",
    key: "customMessage",
    expected: "JP：カスタムロケールのメッセージ",
  },
  fallbackToDefaultLocale: {
    language: "ja-JP",
    key: "missingMessage",
    expected: "Message not defined in non-default locales",
  },
  differentLocale: {
    language: "en",
    key: "effectiveMessage",
    expected: "Message with effective content",
  },
  undefinedMessage: {
    language: "en",
    key: "undefinedMessage",
    expected: "undefinedMessage",
  }
};
export async function test_get({ language, key, params, expected }) {
  const l10n = await prepare(language);
  is(expected, l10n.get(key, params || null));
}
