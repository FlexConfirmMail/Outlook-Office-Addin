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
  "null to empty": {
    str: null,
    expected: [],
  },
  "undefined to empty": {
    str: undefined,
    expected: [],
  },
  "empty string to empty": {
    str: "",
    expected: [],
  },
}
export function test_toArray({ str, expected }) {
  is(
    expected,
    ConfigLoader.toArray(str)
  );
}

test_parseUnsafeConfig.parameters = {
  "default single line": {
    str: "a@example.com",
    expected: { "WARNING" : ["a@example.com"] },
  },
  "WARNING single line": {
    str: "[WARNING]\na@example.com",
    expected: { "WARNING" : ["a@example.com"] },
  },
  "warning single line": {
    str: "[warning]\na@example.com",
    expected: { "WARNING" : ["a@example.com"] },
  },
  "BLOCK single line": {
    str: "[BLOCK]\na@example.com",
    expected: { "BLOCK" : ["a@example.com"] },
  },
  "multi lines": {
    str: "[WARNING]\na@example.com\nb@example.com\n[BLOCK]\nc@example.com\nd@example.com",
    expected: { 
      "WARNING" : ["a@example.com", "b@example.com"],
      "BLOCK": ["c@example.com", "d@example.com"]
    },
  },
  "separated section": {
    str: "[WARNING]\na@example.com\nb@example.com\n[BLOCK]\nc@example.com\nd@example.com\n[WARNING]\ne@example.com",
    expected: { 
      "WARNING" : ["a@example.com", "b@example.com", "e@example.com"],
      "BLOCK": ["c@example.com", "d@example.com"]
    },
  },
  "invalid section": {
    str: "[INVALID]\na@example.com\nb@example.com",
    expected: { 
      "WARNING" : ["a@example.com", "b@example.com"]
    },
  },
  "null to empty": {
    str: null,
    expected: {},
  },
  "undefined to empty": {
    str: undefined,
    expected: {},
  },
  "empty string to empty": {
    str: "",
    expected: {},
  },
}
export function test_parseUnsafeConfig({ str, expected }) {
  is(
    expected,
    ConfigLoader.parseUnsafeConfig(str)
  );
}

test_parseUnsafeBodiesConfig.parameters = {
  "no section": {
    str: "Patterns=添付\n" +
         "Message=「添付」が含まれています",
    expected: {},
  },
  "single section": {
    str: "[Section1]\n" +
         "Patterns=添付\n" +
         "Message=[警告] 「添付」が含まれています。",
    expected: { 
      "Section1" : 
      { 
        Patterns: ["添付"], 
        Message: "[警告] 「添付」が含まれています。" 
      } 
    },
  },
  "multi sections": {
    str: "[Section1]\n" +
         "Patterns=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Patterns=添付2,添付3\n" +
         "Message=[警告] 「添付2」または「添付3」が含まれています。",
    expected: { 
      "Section1" : 
      { 
        Patterns: ["添付"], 
        Message: "[警告] 「添付」が含まれています。" 
      },
      "Section2" : 
      { 
        Patterns: ["添付2", "添付3"], 
        Message: "[警告] 「添付2」または「添付3」が含まれています。" 
      } 
    },
  },
  "override section": {
    str: "[Section1]\n" +
         "Patterns=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section1]\n" +
         "Patterns=添付After\n" +
         "Message=[警告] 「添付After」が含まれています。",
    expected: { 
      "Section1" : 
      { 
        Patterns: ["添付After"], 
        Message: "[警告] 「添付After」が含まれています。" 
      },
    },
  },
  "null to empty": {
    str: null,
    expected: {},
  },
  "undefined to empty": {
    str: undefined,
    expected: {},
  },
  "empty string to empty": {
    str: "",
    expected: {},
  },
}
export function test_parseUnsafeBodiesConfig({ str, expected }) {
  is(
    expected,
    ConfigLoader.parseUnsafeBodiesConfig(str)
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
  "RequireCheckSubject=True": {
    str: "RequireCheckSubject=True",
    expected: { "RequireCheckSubject": true },
  },
  "RequireCheckBody=True": {
    str: "RequireCheckBody=True",
    expected: { "RequireCheckBody": true },
  },
  "MainSkipIfNoExt=True": {
    str: "MainSkipIfNoExt=True",
    expected: { "MainSkipIfNoExt": true },
  },
  "AppointmentConfirmationEnabled=True": {
    str: "AppointmentConfirmationEnabled=True",
    expected: { "AppointmentConfirmationEnabled": true },
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
  "RequireCheckSubject=1": {
    str: "RequireCheckSubject=1",
    expected: { "RequireCheckSubject": true },
  },
  "RequireCheckBody=1": {
    str: "RequireCheckBody=1",
    expected: { "RequireCheckBody": true },
  },
  "MainSkipIfNoExt=1": {
    str: "MainSkipIfNoExt=1",
    expected: { "MainSkipIfNoExt": true },
  },
  "AppointmentConfirmationEnabled=1": {
    str: "AppointmentConfirmationEnabled=1",
    expected: { "AppointmentConfirmationEnabled": true },
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
  "RequireCheckSubject=on": {
    str: "RequireCheckSubject=on",
    expected: { "RequireCheckSubject": true },
  },
  "RequireCheckBody=on": {
    str: "RequireCheckBody=on",
    expected: { "RequireCheckBody": true },
  },
  "MainSkipIfNoExt=on": {
    str: "MainSkipIfNoExt=on",
    expected: { "MainSkipIfNoExt": true },
  },
  "AppointmentConfirmationEnabled=on": {
    str: "AppointmentConfirmationEnabled=on",
    expected: { "AppointmentConfirmationEnabled": true },
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
    expected: {},
  },
  "undefined to empty": {
    str: undefined,
    expected: {},
  },
  "empty string to empty": {
    str: "",
    expected: {},
  },
}
export function test_toDictionaryCommon({ str, expected }) {
  is(
    expected,
    ConfigLoader.toDictionary(str, ConfigLoader.commonParamDefs)
  );
}

export function test_createDefaultConfig() {
  is(
    {
      common: {
        CountEnabled: true,
        CountAllowSkip: true,
        SafeBccEnabled: true,
        RequireCheckSubject: false,
        RequireCheckBody: false,
        MainSkipIfNoExt: false,
        AppointmentConfirmationEnabled: false,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: false,
        DelayDeliverySeconds: 60,
        FixedParameters: [],
      },
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles: {},
      unsafeBodies: {},
      commonString: "",
      trustedDomainsString: "",
      unsafeDomainsString: "",
      unsafeFilesString: "",
      unsafeBodiesString: "",
    },
    ConfigLoader.createDefaultConfig()
  );
}

export function test_createEmptyConfig() {
  is(
    {
      common: {},
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles: {},
      unsafeBodies: {},
      commonString: "",
      trustedDomainsString: "",
      unsafeDomainsString: "",
      unsafeFilesString: "",
      unsafeBodiesString: "",
    },
    ConfigLoader.createEmptyConfig()
  );
}

test_merge.parameters = {
  "left is empty": {
    left: {
      common: {},
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles: {},
      unsafeBodies: {},
      commonString: "",
      trustedDomainsString: "",
      unsafeDomainsString: "",
      unsafeFilesString: "",
      unsafeBodiesString: "",
    },
    right: {
      common: {
        CountEnabled: true,
        CountAllowSkip: true,
        SafeBccEnabled: true,
        RequireCheckSubject: true,
        RequireCheckBody: true,
        MainSkipIfNoExt: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        FixedParameters: [],
      },
      trustedDomains: ["trustedDomain"],
      unsafeDomains: { "WARNING": ["unsafeDomain"] },
      unsafeFiles: { "WARNING": ["unsafeFile"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Patterns: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Patterns: ["添付2", "添付3"], 
          Message: "[警告] 「添付2」または「添付3」が含まれています。" 
        } 
      },
      commonString:
        "CountEnabled = true\n" +
        "CountAllowSkip = true\n" +
        "SafeBccEnabled = true\n" +
        "RequireCheckSubject = true\n" +
        "RequireCheckBody = true\n" +
        "MainSkipIfNoExt = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60",
      trustedDomainsString: "trustedDomain",
      unsafeDomainsString: "unsafeDomain",
      unsafeFilesString: "unsafeFile",
      unsafeBodiesString: "[Section1]\n" +
         "Patterns=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Patterns=添付2,添付3\n" +
         "Message=[警告] 「添付2」または「添付3」が含まれています。",
    },
    expected: {
      common: {
        CountEnabled: true,
        CountAllowSkip: true,
        SafeBccEnabled: true,
        RequireCheckSubject: true,
        RequireCheckBody: true,
        MainSkipIfNoExt: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        FixedParameters: [],
      },
      trustedDomains: ["trustedDomain"],
      unsafeDomains: { "WARNING": ["unsafeDomain"] },
      unsafeFiles: { "WARNING": ["unsafeFile"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Patterns: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Patterns: ["添付2", "添付3"], 
          Message: "[警告] 「添付2」または「添付3」が含まれています。" 
        } 
      },
      commonString:
        "CountEnabled = true\n" +
        "CountAllowSkip = true\n" +
        "SafeBccEnabled = true\n" +
        "RequireCheckSubject = true\n" +
        "RequireCheckBody = true\n" +
        "MainSkipIfNoExt = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "SafeBccReconfirmationThreshold = 0\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60",
      trustedDomainsString: "trustedDomain",
      unsafeDomainsString: "unsafeDomain",
      unsafeFilesString: "unsafeFile",
      unsafeBodiesString: "[Section1]\n" +
         "Patterns=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Patterns=添付2,添付3\n" +
         "Message=[警告] 「添付2」または「添付3」が含まれています。",
    }
  },
  "right is empty": {
    left: {
      common: {
        CountEnabled: true,
        CountAllowSkip: true,
        SafeBccEnabled: true,
        RequireCheckSubject: true,
        RequireCheckBody: true,
        MainSkipIfNoExt: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        FixedParameters: [],
      },
      trustedDomains: ["trustedDomain"],
      unsafeDomains: { "WARNING": ["unsafeDomain"] },
      unsafeFiles: { "WARNING": ["unsafeFile"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Patterns: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Patterns: ["添付2", "添付3"], 
          Message: "[警告] 「添付2」または「添付3」が含まれています。" 
        } 
      },
      commonString: 
        "CountEnabled = true\n" +
        "CountAllowSkip = true\n" +
        "SafeBccEnabled = true\n" +
        "RequireCheckSubject = true\n" +
        "RequireCheckBody = true\n" +
        "MainSkipIfNoExt = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "SafeBccReconfirmationThreshold = 0\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60",
      trustedDomainsString: "trustedDomain",
      unsafeDomainsString: "unsafeDomain",
      unsafeFilesString: "unsafeFile",
      unsafeBodiesString: "[Section1]\n" +
         "Patterns=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Patterns=添付2,添付3\n" +
         "Message=[警告] 「添付2」または「添付3」が含まれています。",
    },
    right: {
      common: {},
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles: {},
      unsafeBodies: {},
      commonString: "",
      trustedDomainsString: "",
      unsafeDomainsString: "",
      unsafeFilesString: "",
      unsafeBodiesString: "",
    },
    expected: {
      common: {
        CountEnabled: true,
        CountAllowSkip: true,
        SafeBccEnabled: true,
        RequireCheckSubject: true,
        RequireCheckBody: true,
        MainSkipIfNoExt: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        FixedParameters: [],
      },
      trustedDomains: ["trustedDomain"],
      unsafeDomains: { "WARNING": ["unsafeDomain"] },
      unsafeFiles: { "WARNING": ["unsafeFile"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Patterns: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Patterns: ["添付2", "添付3"], 
          Message: "[警告] 「添付2」または「添付3」が含まれています。" 
        } 
      },
      commonString: 
        "CountEnabled = true\n" +
        "CountAllowSkip = true\n" +
        "SafeBccEnabled = true\n" +
        "RequireCheckSubject = true\n" +
        "RequireCheckBody = true\n" +
        "MainSkipIfNoExt = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "SafeBccReconfirmationThreshold = 0\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60",
      trustedDomainsString: "trustedDomain",
      unsafeDomainsString: "unsafeDomain",
      unsafeFilesString: "unsafeFile",
      unsafeBodiesString: "[Section1]\n" +
         "Patterns=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Patterns=添付2,添付3\n" +
         "Message=[警告] 「添付2」または「添付3」が含まれています。",
    }
  },
  "merge right to left": {
    left: {
      common: {
        CountEnabled: true,
        CountAllowSkip: true,
        SafeBccEnabled: true,
        RequireCheckSubject: true,
        RequireCheckBody: true,
        MainSkipIfNoExt: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        FixedParameters: [],
      },
      trustedDomains: ["trustedDomain_left"],
      unsafeDomains: { "WARNING": ["unsafeDomain_left"] },
      unsafeFiles: { "WARNING": ["unsafeFile_left"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Patterns: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Patterns: ["添付2", "添付3"], 
          Message: "[警告] 「添付2」または「添付3」が含まれています。" 
        } 
      },
      commonString: 
        "CountEnabled = true\n" +
        "CountAllowSkip = true\n" +
        "SafeBccEnabled = true\n" +
        "RequireCheckSubject = true\n" +
        "RequireCheckBody = true\n" +
        "MainSkipIfNoExt = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60",
      trustedDomainsString: "trustedDomain_left",
      unsafeDomainsString: "unsafeDomain_left",
      unsafeFilesString: "unsafeFile_left",
      unsafeBodiesString: "[Section1]\n" +
         "Patterns=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Patterns=添付2,添付3\n" +
         "Message=[警告] 「添付2」または「添付3」が含まれています。",
    },
    right: {
      common: {
        CountEnabled: false,
        CountAllowSkip: false,
        SafeBccEnabled: false,
        RequireCheckSubject: false,
        RequireCheckBody: false,
        MainSkipIfNoExt: false,
        AppointmentConfirmationEnabled: false,
        SafeNewDomainsEnabled: false,
        CountSeconds: 2,
        SafeBccThreshold: 2,
        SafeBccReconfirmationThreshold: 1,
        DelayDeliveryEnabled: false,
        DelayDeliverySeconds: 10,
        FixedParameters: ["CountSeconds"],
      },
      trustedDomains: ["trustedDomain_right"],
      unsafeDomains: { "WARNING": ["unsafeDomain_right"] },
      unsafeFiles: { "WARNING": ["unsafeFile_right"] },
      unsafeBodies: { 
        "Section2" : 
        { 
          Patterns: ["添付2_上書き", "添付3_上書き"], 
          Message: "[警告] 「添付2_上書き」または「添付3_上書き」が含まれています。" 
        },
        "Section3" : 
        { 
          Patterns: ["セクション3"], 
          Message: "[警告] 「セクション3」が含まれています。" 
        },
      },
      commonString: 
        "CountEnabled = false\n" +
        "CountAllowSkip = false\n" +
        "SafeBccEnabled = false\n" +
        "RequireCheckSubject = false\n" +
        "RequireCheckBody = false\n" +
        "MainSkipIfNoExt = false\n" +
        "AppointmentConfirmationEnabled = false\n" +
        "SafeNewDomainsEnabled = false\n" +
        "CountSeconds = 2\n" +
        "SafeBccThreshold = 2\n" +
        "SafeBccReconfirmationThreshold = 1\n" +
        "DelayDeliveryEnabled = false\n" +
        "DelayDeliverySeconds = 10\n" +
        "FixedParameters = CountSeconds",
      trustedDomainsString: "trustedDomain_right",
      unsafeDomainsString: "unsafeDomain_right",
      unsafeFilesString: "unsafeFile_right",
      unsafeBodiesString: "[Section2]\n" +
         "Patterns=添付2_上書き,添付3_上書き\n" +
         "Message=[警告] 「添付2_上書き」または「添付3_上書き」が含まれています。\n" +
         "[Section3]\n" +
         "Patterns=セクション3\n" +
         "Message=[警告] 「セクション3」が含まれています。",
    },
    expected: {
      common: {
        CountEnabled: false,
        CountAllowSkip: false,
        SafeBccEnabled: false,
        RequireCheckSubject: false,
        RequireCheckBody: false,
        MainSkipIfNoExt: false,
        AppointmentConfirmationEnabled: false,
        SafeNewDomainsEnabled: false,
        CountSeconds: 2,
        SafeBccThreshold: 2,
        SafeBccReconfirmationThreshold: 1,
        DelayDeliveryEnabled: false,
        DelayDeliverySeconds: 10,
        FixedParameters: ["CountSeconds"],
      },
      trustedDomains: ["trustedDomain_left", "trustedDomain_right"],
      unsafeDomains: { "WARNING": ["unsafeDomain_left", "unsafeDomain_right"] },
      unsafeFiles: { "WARNING": ["unsafeFile_left", "unsafeFile_right"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Patterns: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Patterns: ["添付2_上書き", "添付3_上書き"], 
          Message: "[警告] 「添付2_上書き」または「添付3_上書き」が含まれています。" 
        },
        "Section3" : 
        { 
          Patterns: ["セクション3"], 
          Message: "[警告] 「セクション3」が含まれています。" 
        },
      },
      commonString: 
        "CountEnabled = false\n" +
        "CountAllowSkip = false\n" +
        "SafeBccEnabled = false\n" +
        "RequireCheckSubject = false\n" +
        "RequireCheckBody = false\n" +
        "MainSkipIfNoExt = false\n" +
        "AppointmentConfirmationEnabled = false\n" +
        "SafeNewDomainsEnabled = false\n" +
        "CountSeconds = 2\n" +
        "SafeBccThreshold = 2\n" +
        "SafeBccReconfirmationThreshold = 1\n" +
        "DelayDeliveryEnabled = false\n" +
        "DelayDeliverySeconds = 10\n" +
        "FixedParameters = CountSeconds",
      trustedDomainsString: "trustedDomain_left\ntrustedDomain_right",
      unsafeDomainsString: "unsafeDomain_left\n[WARNING]\nunsafeDomain_right",
      unsafeFilesString: "unsafeFile_left\n[WARNING]\nunsafeFile_right",
      unsafeBodiesString: "[Section1]\n" +
         "Patterns=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Patterns=添付2,添付3\n" +
         "Message=[警告] 「添付2」または「添付3」が含まれています。\n" +
         "[Section2]\n" +
         "Patterns=添付2_上書き,添付3_上書き\n" +
         "Message=[警告] 「添付2_上書き」または「添付3_上書き」が含まれています。\n" +
         "[Section3]\n" +
         "Patterns=セクション3\n" +
         "Message=[警告] 「セクション3」が含まれています。",
    },
  },
  "fix all parameters": {
    left: {
      common: {
        CountEnabled: true,
        CountAllowSkip: true,
        SafeBccEnabled: true,
        RequireCheckSubject: true,
        RequireCheckBody: true,
        MainSkipIfNoExt: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        FixedParameters: [
          "CountEnabled",
          "CountAllowSkip",
          "SafeBccEnabled",
          "RequireCheckSubject",
          "RequireCheckBody",
          "MainSkipIfNoExt",
          "AppointmentConfirmationEnabled",
          "SafeNewDomainsEnabled",
          "CountSeconds",
          "SafeBccThreshold",
          "SafeBccReconfirmationThreshold",
          "DelayDeliveryEnabled",
          "DelayDeliverySeconds",
          "TrustedDomains",
          "UnsafeDomains",
          "UnsafeFiles",
          "UnsafeBodies"
        ],
      },
      trustedDomains: ["trustedDomain_left"],
      unsafeDomains: { "WARNING": ["unsafeDomain_left"] },
      unsafeFiles: { "WARNING": ["unsafeFile_left"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Patterns: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Patterns: ["添付2", "添付3"], 
          Message: "[警告] 「添付2」または「添付3」が含まれています。" 
        } 
      },
      commonString: 
        "CountEnabled = true\n" +
        "CountAllowSkip = true\n" +
        "SafeBccEnabled = true\n" +
        "RequireCheckSubject = true\n" +
        "RequireCheckBody = true\n" +
        "MainSkipIfNoExt = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "SafeBccReconfirmationThreshold = 0\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60\n" +
        "FixedParameters = " + 
            "CountEnabled," +
            "CountAllowSkip," +
            "SafeBccEnabled," +
            "MainSkipIfNoExt," +
            "AppointmentConfirmationEnabled," +
            "SafeNewDomainsEnabled," +
            "CountSeconds," +
            "SafeBccThreshold," +
            "SafeBccReconfirmationThreshold," +
            "DelayDeliveryEnabled," +
            "DelayDeliverySeconds," +
            "TrustedDomains," +
            "UnsafeDomains," +
            "UnsafeFiles," + 
            "UnsafeBodies",
      trustedDomainsString: "trustedDomain_left",
      unsafeDomainsString: "unsafeDomain_left",
      unsafeFilesString: "unsafeFile_left",
      unsafeBodiesString: "[Section1]\n" +
         "Patterns=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Patterns=添付2,添付3\n" +
         "Message=[警告] 「添付2」または「添付3」が含まれています。",
    },
    right: {
      common: {
        CountEnabled: false,
        CountAllowSkip: false,
        SafeBccEnabled: false,
        RequireCheckSubject: false,
        RequireCheckBody: false,
        MainSkipIfNoExt: false,
        AppointmentConfirmationEnabled: false,
        SafeNewDomainsEnabled: false,
        CountSeconds: 2,
        SafeBccThreshold: 2,
        SafeBccReconfirmationThreshold: 1,
        DelayDeliveryEnabled: false,
        DelayDeliverySeconds: 10,
        FixedParameters: ["CountSeconds"],
      },
      trustedDomains: ["trustedDomain_right"],
      unsafeDomains: { "WARNING": ["unsafeDomain_right"] },
      unsafeFiles: { "WARNING": ["unsafeFile_right"] },
      unsafeBodies: { 
        "Section3" : 
        { 
          Patterns: ["セクション3"], 
          Message: "[警告] 「セクション3」が含まれています。" 
        },
      },
      commonString: 
        "CountEnabled = false\n" +
        "CountAllowSkip = false\n" +
        "SafeBccEnabled = false\n" +
        "RequireCheckSubject = false\n" +
        "RequireCheckBody = false\n" +
        "MainSkipIfNoExt = false\n" +
        "AppointmentConfirmationEnabled = false\n" +
        "SafeNewDomainsEnabled = false\n" +
        "CountSeconds = 2\n" +
        "SafeBccThreshold = 2\n" +
        "SafeBccReconfirmationThreshold = 1\n" +
        "DelayDeliveryEnabled = false\n" +
        "DelayDeliverySeconds = 10\n" +
        "FixedParameters = CountSeconds",
      trustedDomainsString: "trustedDomain_right",
      unsafeDomainsString: "unsafeDomain_right",
      unsafeFilesString: "unsafeFile_right",
      unsafeBodiesString: "[Section3]\n" +
         "Patterns=セクション3\n" +
         "Message=[警告] 「セクション3」が含まれています。",
    },
    expected: {
      common: {
        CountEnabled: true,
        CountAllowSkip: true,
        SafeBccEnabled: true,
        RequireCheckSubject: true,
        RequireCheckBody: true,
        MainSkipIfNoExt: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        FixedParameters: [
          "CountEnabled",
          "CountAllowSkip",
          "SafeBccEnabled",
          "RequireCheckSubject",
          "RequireCheckBody",
          "MainSkipIfNoExt",
          "AppointmentConfirmationEnabled",
          "SafeNewDomainsEnabled",
          "CountSeconds",
          "SafeBccThreshold",
          "SafeBccReconfirmationThreshold",
          "DelayDeliveryEnabled",
          "DelayDeliverySeconds",
          "TrustedDomains",
          "UnsafeDomains",
          "UnsafeFiles",
          "UnsafeBodies"
        ],
      },
      trustedDomains: ["trustedDomain_left"],
      unsafeDomains: { "WARNING": ["unsafeDomain_left"] },
      unsafeFiles: { "WARNING": ["unsafeFile_left"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Patterns: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Patterns: ["添付2", "添付3"], 
          Message: "[警告] 「添付2」または「添付3」が含まれています。" 
        } 
      },
      commonString: 
        "CountEnabled = true\n" +
        "CountAllowSkip = true\n" +
        "SafeBccEnabled = true\n" +
        "RequireCheckSubject = true\n" +
        "RequireCheckBody = true\n" +
        "MainSkipIfNoExt = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "SafeBccReconfirmationThreshold = 0\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60\n" +
        "FixedParameters = " + 
          "CountEnabled," +
          "CountAllowSkip," +
          "SafeBccEnabled," +
          "RequireCheckSubject," +
          "RequireCheckBody," +
          "MainSkipIfNoExt," +
          "AppointmentConfirmationEnabled," +
          "SafeNewDomainsEnabled," +
          "CountSeconds," +
          "SafeBccThreshold," +
          "SafeBccReconfirmationThreshold," +
          "DelayDeliveryEnabled," +
          "DelayDeliverySeconds," +
          "TrustedDomains," +
          "UnsafeDomains," +
          "UnsafeFiles," + 
          "UnsafeBodies",
      trustedDomainsString: "trustedDomain_left",
      unsafeDomainsString: "unsafeDomain_left",
      unsafeFilesString: "unsafeFile_left",
      unsafeBodiesString: "[Section1]\n" +
         "Patterns=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Patterns=添付2,添付3\n" +
         "Message=[警告] 「添付2」または「添付3」が含まれています。",
    },
  },
}
export function test_merge({ left, right, expected }) {
  is(
    expected,
    ConfigLoader.merge(left, right)
  );
}