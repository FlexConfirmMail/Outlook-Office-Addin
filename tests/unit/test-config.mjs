/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
"use strict";

import { Config } from "../../src/web/config.mjs";
import { assert } from "tiny-esm-test-runner";
const { is } = assert;

export function test_createDefaultConfig() {
  is(
    new Config({
      common: {
        CountEnabled: true,
        CountAllowSkip: true,
        SafeBccEnabled: true,
        RequireCheckSubject: false,
        RequireCheckBody: false,
        MainSkipIfNoExt: false,
        CountSkipIfNoExt: false,
        UntrustUnsafeRecipients: false,
        AppointmentConfirmationEnabled: false,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: false,
        DelayDeliverySeconds: 60,
        ConvertToBccEnabled: false,
        ConvertToBccThreshold: 2,
        BlockDistributionLists: true,
        EmphasizeUntrustedToCc: false,
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
    }),
    Config.createDefaultConfig()
  );
}

export function test_createEmptyConfig() {
  is(
    new Config({
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
    }),
    Config.createEmptyConfig()
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
        CountSkipIfNoExt: true,
        UntrustUnsafeRecipients: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        ConvertToBccEnabled: true,
        ConvertToBccThreshold: 3,
        BlockDistributionLists: true,
        EmphasizeUntrustedToCc: true,
        FixedParameters: [],
      },
      trustedDomains: ["trustedDomain"],
      unsafeDomains: { "WARNING": ["unsafeDomain"] },
      unsafeFiles: { "WARNING": ["unsafeFile"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Keywords: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Keywords: ["添付2", "添付3"], 
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
        "CountSkipIfNoExt = true\n" +
        "UntrustUnsafeRecipients = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60\n" +
        "ConvertToBccEnabled = true\n" +
        "ConvertToBccThreshold = 3\n" +
        "BlockDistributionLists = true\n" +
        "EmphasizeUntrustedToCc = true",
      trustedDomainsString: "trustedDomain",
      unsafeDomainsString: "unsafeDomain",
      unsafeFilesString: "unsafeFile",
      unsafeBodiesString: "[Section1]\n" +
         "Keywords=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Keywords=添付2,添付3\n" +
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
        CountSkipIfNoExt: true,
        UntrustUnsafeRecipients: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        ConvertToBccEnabled: true,
        ConvertToBccThreshold: 3,
        BlockDistributionLists: true,
        EmphasizeUntrustedToCc: true,
        FixedParameters: [],
      },
      trustedDomains: ["trustedDomain"],
      unsafeDomains: { "WARNING": ["unsafeDomain"] },
      unsafeFiles: { "WARNING": ["unsafeFile"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Keywords: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Keywords: ["添付2", "添付3"], 
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
        "CountSkipIfNoExt = true\n" +
        "UntrustUnsafeRecipients = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "SafeBccReconfirmationThreshold = 0\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60\n" +
        "ConvertToBccEnabled = true\n" +
        "ConvertToBccThreshold = 3\n" +
        "BlockDistributionLists = true\n" +
        "EmphasizeUntrustedToCc = true",
      trustedDomainsString: "trustedDomain",
      unsafeDomainsString: "unsafeDomain",
      unsafeFilesString: "unsafeFile",
      unsafeBodiesString: "[Section1]\n" +
         "Keywords=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Keywords=添付2,添付3\n" +
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
        CountSkipIfNoExt: true,
        UntrustUnsafeRecipients: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        ConvertToBccEnabled: true,
        ConvertToBccThreshold: 3,
        BlockDistributionLists: true,
        EmphasizeUntrustedToCc: true,
        FixedParameters: [],
      },
      trustedDomains: ["trustedDomain"],
      unsafeDomains: { "WARNING": ["unsafeDomain"] },
      unsafeFiles: { "WARNING": ["unsafeFile"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Keywords: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Keywords: ["添付2", "添付3"], 
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
        "CountSkipIfNoExt = true\n" +
        "UntrustUnsafeRecipients = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "SafeBccReconfirmationThreshold = 0\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60\n" +
        "ConvertToBccEnabled = true\n" +
        "ConvertToBccThreshold = 3\n" +
        "BlockDistributionLists = true\n" +
        "EmphasizeUntrustedToCc = true",
      trustedDomainsString: "trustedDomain",
      unsafeDomainsString: "unsafeDomain",
      unsafeFilesString: "unsafeFile",
      unsafeBodiesString: "[Section1]\n" +
         "Keywords=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Keywords=添付2,添付3\n" +
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
        CountSkipIfNoExt: true,
        UntrustUnsafeRecipients: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        ConvertToBccEnabled: true,
        ConvertToBccThreshold: 3,
        BlockDistributionLists: true,
        EmphasizeUntrustedToCc: true,
        FixedParameters: [],
      },
      trustedDomains: ["trustedDomain"],
      unsafeDomains: { "WARNING": ["unsafeDomain"] },
      unsafeFiles: { "WARNING": ["unsafeFile"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Keywords: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Keywords: ["添付2", "添付3"], 
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
        "CountSkipIfNoExt = true\n" +
        "UntrustUnsafeRecipients = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "SafeBccReconfirmationThreshold = 0\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60\n" +
        "ConvertToBccEnabled = true\n" +
        "ConvertToBccThreshold = 3\n" +
        "BlockDistributionLists = true\n" +
        "EmphasizeUntrustedToCc = true",
      trustedDomainsString: "trustedDomain",
      unsafeDomainsString: "unsafeDomain",
      unsafeFilesString: "unsafeFile",
      unsafeBodiesString: "[Section1]\n" +
         "Keywords=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Keywords=添付2,添付3\n" +
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
        CountSkipIfNoExt: true,
        UntrustUnsafeRecipients: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        ConvertToBccEnabled: true,
        ConvertToBccThreshold: 4,
        BlockDistributionLists: true,
        EmphasizeUntrustedToCc: true,
        FixedParameters: [],
      },
      trustedDomains: ["trustedDomain_left"],
      unsafeDomains: { "WARNING": ["unsafeDomain_left"] },
      unsafeFiles: { "WARNING": ["unsafeFile_left"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Keywords: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Keywords: ["添付2", "添付3"], 
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
        "CountSkipIfNoExt = true\n" +
        "UntrustUnsafeRecipients = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60\n" +
        "ConvertToBccEnabled = true\n" +
        "ConvertToBccThreshold = 4\n" +
        "BlockDistributionLists = true\n" +
        "EmphasizeUntrustedToCc = true",
      trustedDomainsString: "trustedDomain_left",
      unsafeDomainsString: "unsafeDomain_left",
      unsafeFilesString: "unsafeFile_left",
      unsafeBodiesString: "[Section1]\n" +
         "Keywords=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Keywords=添付2,添付3\n" +
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
        CountSkipIfNoExt: false,
        UntrustUnsafeRecipients: false,
        AppointmentConfirmationEnabled: false,
        SafeNewDomainsEnabled: false,
        CountSeconds: 2,
        SafeBccThreshold: 2,
        SafeBccReconfirmationThreshold: 1,
        DelayDeliveryEnabled: false,
        DelayDeliverySeconds: 10,
        ConvertToBccEnabled: false,
        ConvertToBccThreshold: 2,
        BlockDistributionLists: false,
        EmphasizeUntrustedToCc: false,
        FixedParameters: ["CountSeconds"],
      },
      trustedDomains: ["trustedDomain_right"],
      unsafeDomains: { "WARNING": ["unsafeDomain_right"] },
      unsafeFiles: { "WARNING": ["unsafeFile_right"] },
      unsafeBodies: { 
        "Section2" : 
        { 
          Keywords: ["添付2_上書き", "添付3_上書き"], 
          Message: "[警告] 「添付2_上書き」または「添付3_上書き」が含まれています。" 
        },
        "Section3" : 
        { 
          Keywords: ["セクション3"], 
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
        "CountSkipIfNoExt = false\n" +
        "UntrustUnsafeRecipients = false\n" +
        "AppointmentConfirmationEnabled = false\n" +
        "SafeNewDomainsEnabled = false\n" +
        "CountSeconds = 2\n" +
        "SafeBccThreshold = 2\n" +
        "SafeBccReconfirmationThreshold = 1\n" +
        "DelayDeliveryEnabled = false\n" +
        "DelayDeliverySeconds = 10\n" +
        "ConvertToBccEnabled = false\n" +
        "ConvertToBccThreshold = 2\n" +
        "BlockDistributionLists = false\n" +
        "EmphasizeUntrustedToCc = false\n" +
        "FixedParameters = CountSeconds",
      trustedDomainsString: "trustedDomain_right",
      unsafeDomainsString: "unsafeDomain_right",
      unsafeFilesString: "unsafeFile_right",
      unsafeBodiesString: "[Section2]\n" +
         "Keywords=添付2_上書き,添付3_上書き\n" +
         "Message=[警告] 「添付2_上書き」または「添付3_上書き」が含まれています。\n" +
         "[Section3]\n" +
         "Keywords=セクション3\n" +
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
        CountSkipIfNoExt: false,
        UntrustUnsafeRecipients: false,
        AppointmentConfirmationEnabled: false,
        SafeNewDomainsEnabled: false,
        CountSeconds: 2,
        SafeBccThreshold: 2,
        SafeBccReconfirmationThreshold: 1,
        DelayDeliveryEnabled: false,
        DelayDeliverySeconds: 10,
        ConvertToBccEnabled: false,
        ConvertToBccThreshold: 2,
        BlockDistributionLists: false,
        EmphasizeUntrustedToCc: false,
        FixedParameters: ["CountSeconds"],
      },
      trustedDomains: ["trustedDomain_left", "trustedDomain_right"],
      unsafeDomains: { "WARNING": ["unsafeDomain_left", "unsafeDomain_right"] },
      unsafeFiles: { "WARNING": ["unsafeFile_left", "unsafeFile_right"] },
      unsafeBodies: { 
        "Section1" : 
        { 
          Keywords: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Keywords: ["添付2_上書き", "添付3_上書き"], 
          Message: "[警告] 「添付2_上書き」または「添付3_上書き」が含まれています。" 
        },
        "Section3" : 
        { 
          Keywords: ["セクション3"], 
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
        "CountSkipIfNoExt = false\n" +
        "UntrustUnsafeRecipients = false\n" +
        "AppointmentConfirmationEnabled = false\n" +
        "SafeNewDomainsEnabled = false\n" +
        "CountSeconds = 2\n" +
        "SafeBccThreshold = 2\n" +
        "SafeBccReconfirmationThreshold = 1\n" +
        "DelayDeliveryEnabled = false\n" +
        "DelayDeliverySeconds = 10\n" +
        "ConvertToBccEnabled = false\n" +
        "ConvertToBccThreshold = 2\n" +
        "BlockDistributionLists = false\n" +
        "EmphasizeUntrustedToCc = false\n" +
        "FixedParameters = CountSeconds",
      trustedDomainsString: "trustedDomain_left\ntrustedDomain_right",
      unsafeDomainsString: "unsafeDomain_left\n[WARNING]\nunsafeDomain_right",
      unsafeFilesString: "unsafeFile_left\n[WARNING]\nunsafeFile_right",
      unsafeBodiesString: "[Section1]\n" +
         "Keywords=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Keywords=添付2,添付3\n" +
         "Message=[警告] 「添付2」または「添付3」が含まれています。\n" +
         "[Section2]\n" +
         "Keywords=添付2_上書き,添付3_上書き\n" +
         "Message=[警告] 「添付2_上書き」または「添付3_上書き」が含まれています。\n" +
         "[Section3]\n" +
         "Keywords=セクション3\n" +
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
        CountSkipIfNoExt: true,
        UntrustUnsafeRecipients: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        ConvertToBccEnabled: true,
        ConvertToBccThreshold: 3,
        BlockDistributionLists: true,
        EmphasizeUntrustedToCc: true,
        FixedParameters: [
          "CountEnabled",
          "CountAllowSkip",
          "SafeBccEnabled",
          "RequireCheckSubject",
          "RequireCheckBody",
          "MainSkipIfNoExt",
          "CountSkipIfNoExt",
          "UntrustUnsafeRecipients",
          "AppointmentConfirmationEnabled",
          "SafeNewDomainsEnabled",
          "CountSeconds",
          "SafeBccThreshold",
          "SafeBccReconfirmationThreshold",
          "DelayDeliveryEnabled",
          "DelayDeliverySeconds",
          "ConvertToBccEnabled",
          "ConvertToBccThreshold",
          "BlockDistributionLists",
          "EmphasizeUntrustedToCc",
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
          Keywords: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Keywords: ["添付2", "添付3"], 
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
        "CountSkipIfNoExt = true\n" +
        "UntrustUnsafeRecipients = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "SafeBccReconfirmationThreshold = 0\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60\n" +
        "ConvertToBccEnabled = true\n" +
        "ConvertToBccThreshold = 3\n" +
        "BlockDistributionLists = true\n" +
        "EmphasizeUntrustedToCc = true\n" +
        "FixedParameters = " + 
            "CountEnabled," +
            "CountAllowSkip," +
            "SafeBccEnabled," +
            "MainSkipIfNoExt," +
            "CountSkipIfNoExt," + 
            "UntrustUnsafeRecipients," +
            "AppointmentConfirmationEnabled," +
            "SafeNewDomainsEnabled," +
            "CountSeconds," +
            "SafeBccThreshold," +
            "SafeBccReconfirmationThreshold," +
            "DelayDeliveryEnabled," +
            "DelayDeliverySeconds," +
            "ConvertToBccEnabled," +
            "ConvertToBccThreshold," +
            "BlockDistributionLists," +
            "EmphasizeUntrustedToCc," +
            "TrustedDomains," +
            "UnsafeDomains," +
            "UnsafeFiles," + 
            "UnsafeBodies",
      trustedDomainsString: "trustedDomain_left",
      unsafeDomainsString: "unsafeDomain_left",
      unsafeFilesString: "unsafeFile_left",
      unsafeBodiesString: "[Section1]\n" +
         "Keywords=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Keywords=添付2,添付3\n" +
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
        CountSkipIfNoExt: false,
        UntrustUnsafeRecipients: false,
        AppointmentConfirmationEnabled: false,
        SafeNewDomainsEnabled: false,
        CountSeconds: 2,
        SafeBccThreshold: 2,
        SafeBccReconfirmationThreshold: 1,
        DelayDeliveryEnabled: false,
        DelayDeliverySeconds: 10,
        ConvertToBccEnabled: false,
        ConvertToBccThreshold: 2,
        BlockDistributionLists: false,
        EmphasizeUntrustedToCc: false,
        FixedParameters: ["CountSeconds"],
      },
      trustedDomains: ["trustedDomain_right"],
      unsafeDomains: { "WARNING": ["unsafeDomain_right"] },
      unsafeFiles: { "WARNING": ["unsafeFile_right"] },
      unsafeBodies: { 
        "Section3" : 
        { 
          Keywords: ["セクション3"], 
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
        "CountSkipIfNoExt = false\n" +
        "UntrustUnsafeRecipients = false\n" +
        "AppointmentConfirmationEnabled = false\n" +
        "SafeNewDomainsEnabled = false\n" +
        "CountSeconds = 2\n" +
        "SafeBccThreshold = 2\n" +
        "SafeBccReconfirmationThreshold = 1\n" +
        "DelayDeliveryEnabled = false\n" +
        "DelayDeliverySeconds = 10\n" +
        "ConvertToBccEnabled = false\n" +
        "ConvertToBccThreshold = 2\n" +
        "BlockDistributionLists = false\n" +
        "EmphasizeUntrustedToCc = false\n" +
        "FixedParameters = CountSeconds",
      trustedDomainsString: "trustedDomain_right",
      unsafeDomainsString: "unsafeDomain_right",
      unsafeFilesString: "unsafeFile_right",
      unsafeBodiesString: "[Section3]\n" +
         "Keywords=セクション3\n" +
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
        CountSkipIfNoExt: true,
        UntrustUnsafeRecipients: true,
        AppointmentConfirmationEnabled: true,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: true,
        DelayDeliverySeconds: 60,
        ConvertToBccEnabled: true,
        ConvertToBccThreshold: 3,
        BlockDistributionLists: true,
        EmphasizeUntrustedToCc: true,
        FixedParameters: [
          "CountEnabled",
          "CountAllowSkip",
          "SafeBccEnabled",
          "RequireCheckSubject",
          "RequireCheckBody",
          "MainSkipIfNoExt",
          "CountSkipIfNoExt",
          "UntrustUnsafeRecipients",
          "AppointmentConfirmationEnabled",
          "SafeNewDomainsEnabled",
          "CountSeconds",
          "SafeBccThreshold",
          "SafeBccReconfirmationThreshold",
          "DelayDeliveryEnabled",
          "DelayDeliverySeconds",
          "ConvertToBccEnabled",
          "ConvertToBccThreshold",
          "BlockDistributionLists",
          "EmphasizeUntrustedToCc",
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
          Keywords: ["添付"], 
          Message: "[警告] 「添付」が含まれています。" 
        },
        "Section2" : 
        { 
          Keywords: ["添付2", "添付3"], 
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
        "CountSkipIfNoExt = true\n" +
        "UntrustUnsafeRecipients = true\n" +
        "AppointmentConfirmationEnabled = true\n" +
        "SafeNewDomainsEnabled = true\n" +
        "CountSeconds = 3\n" +
        "SafeBccThreshold = 4\n" +
        "SafeBccReconfirmationThreshold = 0\n" +
        "DelayDeliveryEnabled = true\n" +
        "DelayDeliverySeconds = 60\n" +
        "ConvertToBccEnabled = true\n" +
        "ConvertToBccThreshold = 3\n" +
        "BlockDistributionLists = true\n" +
        "EmphasizeUntrustedToCc = true\n" +
        "FixedParameters = " + 
          "CountEnabled," +
          "CountAllowSkip," +
          "SafeBccEnabled," +
          "RequireCheckSubject," +
          "RequireCheckBody," +
          "MainSkipIfNoExt," +
          "CountSkipIfNoExt," +
          "UntrustUnsafeRecipients," +
          "AppointmentConfirmationEnabled," +
          "SafeNewDomainsEnabled," +
          "CountSeconds," +
          "SafeBccThreshold," +
          "SafeBccReconfirmationThreshold," +
          "DelayDeliveryEnabled," +
          "DelayDeliverySeconds," +
          "ConvertToBccEnabled," +
          "ConvertToBccThreshold," +
          "BlockDistributionLists," +
          "EmphasizeUntrustedToCc," +
          "TrustedDomains," +
          "UnsafeDomains," +
          "UnsafeFiles," + 
          "UnsafeBodies",
      trustedDomainsString: "trustedDomain_left",
      unsafeDomainsString: "unsafeDomain_left",
      unsafeFilesString: "unsafeFile_left",
      unsafeBodiesString: "[Section1]\n" +
         "Keywords=添付\n" +
         "Message=[警告] 「添付」が含まれています。\n" +
         "[Section2]\n" +
         "Keywords=添付2,添付3\n" +
         "Message=[警告] 「添付2」または「添付3」が含まれています。",
    },
  },
}
export function test_merge({ left, right, expected }) {
  const leftConfig = new Config(left);
  const rightConfig = new Config(right);
  const expectedConfig = new Config(expected);
  is(
    expectedConfig,
    leftConfig.merge(rightConfig)
  );
}