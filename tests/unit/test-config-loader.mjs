/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
"use strict";

import { ConfigLoader } from "../../src/web/config-loader.mjs";
import { assert } from "tiny-esm-test-runner";
const { is } = assert;

export function test_format() {
  const actual = ConfigLoader.parseBool("true");
  is(
    true,
    actual
  );
}
test_parseBool.parameters = {
  "true to true": {
    str: "true",
    expected: true,
  },
  "True to true": {
    str: "True",
    expected: true,
  },
  "TRUE to true": {
    str: "TRUE",
    expected: true,
  },
  "yes to true": {
    str: "yes",
    expected: true,
  },
  "Yes to true": {
    str: "Yes",
    expected: true,
  }, 
  "YES to true": {
    str: "YES",
    expected: true,
  },
  "on to true": {
    str: "on",
    expected: true,
  },
  "On to true": {
    str: "On",
    expected: true,
  }, 
  "ON to true": {
    str: "ON",
    expected: true,
  },
  "1 to true": {
    str: "1",
    expected: true,
  },
  "false to false": {
    str: "false",
    expected: false,
  },
  "False to false": {
    str: "False",
    expected: false,
  },
  "FALSE to false": {
    str: "FALSE",
    expected: false,
  },
  "no to false": {
    str: "no",
    expected: false,
  },
  "No to false": {
    str: "No",
    expected: false,
  }, 
  "NO to false": {
    str: "NO",
    expected: false,
  },
  "off to false": {
    str: "off",
    expected: false,
  },
  "Off to false": {
    str: "Off",
    expected: false,
  }, 
  "OFF to false": {
    str: "OFF",
    expected: false,
  },
  "0 to false": {
    str: "0",
    expected: false,
  },
  "null to null": {
    str: undefined,
    expected: null,
  },
  "undefined to null": {
    str: undefined,
    expected: null,
  },
  "foo to null": {
    str: "foo",
    expected: null,
  },
  "-1 to null": {
    str: "-1",
    expected: null,
  },
  "empty string to null": {
    str: "",
    expected: null,
  },
};
export function test_parseBool({ str, expected }) {
  is(
    expected,
    ConfigLoader.parseBool(str)
  );
}

test_toArray.parameters = {
  "single line": {
    str: "a@example.com",
    expected: ["a@example.com"],
  },
  "multi lines": {
    str: "a@example.com\nb@example.com",
    expected: ["a@example.com", "b@example.com"],
  },
  "skip comment": {
    str: "a@example.com\n#comment@example.com\nb@example.com",
    expected: ["a@example.com", "b@example.com"],
  },
  "null to null": {
    str: null,
    expected: null,
  },
  "undefined to null": {
    str: undefined,
    expected: null,
  },
  "empty string to null": {
    str: "",
    expected: null,
  },
}
export function test_toArray({ str, expected }) {
  is(
    expected,
    ConfigLoader.toArray(str)
  );
}

test_toDictionaryCommon.parameters = {
  "CountEnabled=True": {
    str: "CountEnabled=True",
    expected: { "CountEnabled": true },
  },
  "CountAllowSkip=True": {
    str: "CountAllowSkip=True",
    expected: { "CountAllowSkip": true },
  },
  "SafeBccEnabled=True": {
    str: "SafeBccEnabled=True",
    expected: { "SafeBccEnabled": true },
  },
  "MainSkipIfNoExt=True": {
    str: "MainSkipIfNoExt=True",
    expected: { "MainSkipIfNoExt": true },
  },
  "SafeNewDomainsEnabled=True": {
    str: "SafeNewDomainsEnabled=True",
    expected: { "SafeNewDomainsEnabled": true },
  },
  "CountEnabled=1": {
    str: "CountEnabled=1",
    expected: { "CountEnabled": true },
  },
  "CountAllowSkip=1": {
    str: "CountAllowSkip=1",
    expected: { "CountAllowSkip": true },
  },
  "SafeBccEnabled=1": {
    str: "SafeBccEnabled=1",
    expected: { "SafeBccEnabled": true },
  },
  "MainSkipIfNoExt=1": {
    str: "MainSkipIfNoExt=1",
    expected: { "MainSkipIfNoExt": true },
  },
  "SafeNewDomainsEnabled=1": {
    str: "SafeNewDomainsEnabled=1",
    expected: { "SafeNewDomainsEnabled": true },
  },
  "CountEnabled=on": {
    str: "CountEnabled=on",
    expected: { "CountEnabled": true },
  },
  "CountAllowSkip=on": {
    str: "CountAllowSkip=on",
    expected: { "CountAllowSkip": true },
  },
  "SafeBccEnabled=on": {
    str: "SafeBccEnabled=on",
    expected: { "SafeBccEnabled": true },
  },
  "MainSkipIfNoExt=on": {
    str: "MainSkipIfNoExt=on",
    expected: { "MainSkipIfNoExt": true },
  },
  "SafeNewDomainsEnabled=on": {
    str: "SafeNewDomainsEnabled=on",
    expected: { "SafeNewDomainsEnabled": true },
  },
  "CountSeconds=10": {
    str: "CountSeconds=10",
    expected: { "CountSeconds": 10 },
  },
  "SafeBccThreshold=5": {
    str: "SafeBccThreshold=5",
    expected: { "SafeBccThreshold": 5 },
  },
  "Extra spaces": {
    str: " SafeBccThreshold = 5 ",
    expected: { "SafeBccThreshold": 5 },
  },
  "multiple params": {
    str: "CountAllowSkip=True\nSafeBccThreshold=5",
    expected: { 
      "CountAllowSkip": true,
      "SafeBccThreshold": 5
    },
  },
  "multiple params": {
    str: "CountAllowSkip=True\n#CountSeconds=20\nSafeBccThreshold=5",
    expected: { 
      "CountAllowSkip": true,
      "SafeBccThreshold": 5
    },
  },
  "Don't exist": {
    str: "DoNotExist=True",
    expected: {},
  },
  "null to null": {
    str: null,
    expected: null,
  },
  "undefined to null": {
    str: undefined,
    expected: null,
  },
  "empty string to null": {
    str: "",
    expected: null,
  },
}
export function test_toDictionaryCommon({ str, expected }) {
  is(
    expected,
    ConfigLoader.toDictionary(str, ConfigLoader.commonParamDefs)
  );
}