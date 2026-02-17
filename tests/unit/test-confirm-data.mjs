/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
"use strict";

import { L10n } from "../../src/web/l10n.mjs";
import "./l10n.mjs";
import { ConfirmData } from "../../src/web/confirm-data.mjs";
import { assert } from "tiny-esm-test-runner";
const { is } = assert;
import { OfficeMockObject } from 'office-addin-mock';

const mockData = {
  host: "outlook", // Outlookの場合必須
  MailboxEnums : {
    ItemType: {
      Message: "message",
      Appointment: "appointment"
    },
    RecipientType: {
      DistributionList: "distributionList"
    }
  }
};
const officeMock = new OfficeMockObject(mockData);
global.Office = officeMock;

function attachment(name) {
  return { name };
}

async function prepareLocale(language) {
  L10n.clearCache();
  L10n.baseUrl = (new URL(`${import.meta.url}/../../fixtures/`)).toString();
  const locale = new L10n(language);
  await locale.ready;
  return locale;
}

test_classifyTarget.parameters = {
  WithUnsafeFiles: {
    target: {
      to: [
        "aaa@example.com",
        "bbb@example.jp",
        "ccc@example.net",
      ],
      attachments: [
          attachment("Safe.txt"),
          attachment("Unsafe.txt"),
        ],
    },
    config: {
      trustedDomains: ['example.com'],
      unsafeDomains: { 
        "WARNING": ['example.net'],
      },
      unsafeFiles :  { 
        "WARNING": [
          "unsafe",
          "#safe",
          "-safe",
      ]},
      common: {
        BlockDistributionLists: true,
      }
    },
    itemType: Office.MailboxEnums.ItemType.Message,
    expected: {
      recipients: {
        trusted: [
          {
            recipient: "aaa@example.com",
            address: "aaa@example.com",
            domain: "example.com",
            type: "To"
          }
        ],
        untrusted: [
          {
            recipient: "bbb@example.jp",
            address: "bbb@example.jp",
            domain: "example.jp",
            type: "To"
          },
          {
            recipient: "ccc@example.net",
            address: "ccc@example.net",
            domain: "example.net",
            type: "To"
          }
        ],
        unsafeWithDomain: [
          {
            recipient: "ccc@example.net",
            address: "ccc@example.net",
            domain: "example.net",
            type: "To"
          }
        ],
        unsafe: [],
        blockWithDomain: [],
        block: [],
        distributionLists: [],
        rewarningWithDomain: [],
        rewarning: []
      },
      attachments: {
        trusted: [
          {
            name: "Safe.txt"
          }
        ],
        unsafe: [
          {
            name: "Unsafe.txt"
          }
        ],
        block: [],
        rewarning: []
      }
    }
  },
};
export async function test_classifyTarget({ target, config, itemType, expected }) {
  const data = new ConfirmData({target, config, itemType});
  const locale = await prepareLocale("ja");
  data.classifyTarget(locale);
  data.setUnsafeBodiesBlockStatus(locale.language);
  is(expected, data.classified);
}

test_blockSending.parameters = {
  NoBlock: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles:  {},
      unsafeBodies: {},
      common: {
        BlockDistributionLists: true,
      }
    },
    expected: false,
  },
  BlockTargetWithDomain: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: { "BLOCK": [ "example.com" ] },
      unsafeFiles: {},
      unsafeBodies: {},
      common: {
        BlockDistributionLists: true,
      }
    },
    expected: true,
  },
  BlockTargetWithAddress: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: { "BLOCK": [ "aaa@example.com" ] },
      unsafeFiles: {},
      unsafeBodies: {},
      common: {
        BlockDistributionLists: true,
      }
    },
    expected: true,
  },
  BlockTargetWithAttachment: {
    target: {
      to: [],
      attachments: [ 
        attachment("機密.txt"),
      ],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles: { "BLOCK": [ "機密" ] },
      unsafeBodies: {},
      common: {
        BlockDistributionLists: true,
      }
    },
    expected: true,
  },
  BlockTargetWithBody: {
    target: {
      to: [],
      attachments: [ 
        attachment("機密.txt"),
      ],
      bodyText: "社外秘",
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles:  { "BLOCK": [ "機密" ] },
      unsafeBodies: { 
        "TEST" : {
          "WarningType": "BLOCK",
          "Keywords": [ "社外秘" ]
        }
      },
      common: {
        BlockDistributionLists: true,
      }
    },
    expected: true,
  },
  BlockDistributionLists: {
    target: {
      to: [{ 
        displayName: 'test-group',
        domain: '',
        address: '', 
        recipientType: global.Office.MailboxEnums.RecipientType.DistributionList
      },],
    },
    config: {
      common: {
        BlockDistributionLists: true,
      }
    },
    expected: true,
  },
};
export async function test_blockSending({ target, config, expected }) {
  const data = new ConfirmData({target, config, itemType: Office.MailboxEnums.ItemType.Message});
  const locale = await prepareLocale("ja");
  data.classifyTarget(locale);
  data.setUnsafeBodiesBlockStatus(locale.language);
  is(expected, data.blockSending);
}

test_skipConfirm.parameters = {
  AllTrustedAndMainSkipIfNoExtIsFalse: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [ "example.com" ],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        MainSkipIfNoExt: false,
        BlockDistributionLists: true,
      }
    },
    expected: false,
  },
  AllTrustedAndMainSkipIfNoExtIsTrue: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [ "example.com" ],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        MainSkipIfNoExt: true,
        BlockDistributionLists: true,
      }
    },
    expected: true,
  },
  HasUntrusted: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        MainSkipIfNoExt: true,
        BlockDistributionLists: true,
      }
    },
    expected: false,
  },
};
export async function test_skipConfirm({ target, config, expected }) {
  const data = new ConfirmData({target, config, itemType: Office.MailboxEnums.ItemType.Message});
  const locale = await prepareLocale("ja");
  data.classifyTarget(locale);
  data.setUnsafeBodiesBlockStatus(locale.language);
  is(expected, data.skipConfirm);
}

test_skipCountDown.parameters = {
  CountEnabledIsTrueAndNotSkip: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        CountEnabled: true,
        CountSeconds: 10,
        CountSkipIfNoExt: false,
        BlockDistributionLists: true,
      }
    },
    expected: false,
  },
  CountEnabledIsFalse: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        CountEnabled: false,
        CountSeconds: 10,
        CountSkipIfNoExt: false,
        BlockDistributionLists: true,
      }
    },
    expected: true,
  },
  CountSecondsIsZero: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        CountEnabled: true,
        CountSeconds: 0,
        CountSkipIfNoExt: false,
        BlockDistributionLists: true,
      }
    },
    expected: true,
  },
  AllTrustedAndCountSkipIfNoExtIsFalse: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [ "example.com" ],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        CountEnabled: true,
        CountSeconds: 10,
        CountSkipIfNoExt: false,
        BlockDistributionLists: true,
      }
    },
    expected: false,
  },
  AllTrustedAndCountSkipIfNoExtIsTrue: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [ "example.com" ],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        CountEnabled: true,
        CountSeconds: 10,
        CountSkipIfNoExt: true,
        BlockDistributionLists: true,
      }
    },
    expected: true,
  },
  HasUntrusted: {
    target: {
      to: [ "aaa@example.com" ],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        CountEnabled: true,
        CountSeconds: 10,
        CountSkipIfNoExt: true,
        BlockDistributionLists: true,
      }
    },
    expected: false,
  },
};
export async function test_skipCountDown({ target, config, expected }) {
  const data = new ConfirmData({target, config, itemType: Office.MailboxEnums.ItemType.Message});
  const locale = await prepareLocale("ja");
  data.classifyTarget(locale);
  data.setUnsafeBodiesBlockStatus(locale.language);
  is(expected, data.skipCountDown);
}

test_delayDelivery.parameters = {
  DelayDeliveryEnabledIsTrueAndItemTypeIsMessage: {
    target: {
      to: [],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        DelayDeliveryEnabled: true,
        BlockDistributionLists: true,
      }
    },
    itemType: Office.MailboxEnums.ItemType.Message,
    expected: true,
  },
  DelayDeliveryEnabledIsTrueAndItemTypeIsAppointment: {
    target: {
      to: [],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        DelayDeliveryEnabled: true,
        BlockDistributionLists: true,
      }
    },
    itemType: Office.MailboxEnums.ItemType.Appointment,
    expected: false,
  },
  DelayDeliveryEnabledIsFalseAndItemTypeIsMessage: {
    target: {
      to: [],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        DelayDeliveryEnabled: false,
        BlockDistributionLists: true,
      }
    },
    itemType: Office.MailboxEnums.ItemType.Message,
    expected: false,
  },
  DelayDeliveryEnabledIsFalseAndItemTypeIsAppointment: {
    target: {
      to: [],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        DelayDeliveryEnabled: false,
        BlockDistributionLists: true,
      }
    },
    itemType: Office.MailboxEnums.ItemType.Appointment,
    expected: false,
  },
};
export async function test_delayDelivery({ target, config, itemType, expected }) {
  const data = new ConfirmData({target, config, itemType});
  is(expected, data.delayDelivery);
}

test_skipAll.parameters = {
  AppointmentConfirmationEnabledTrueAndItemTypeIsAppointment: {
    target: {
      to: [],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        AppointmentConfirmationEnabled: true,
        BlockDistributionLists: true,
      }
    },
    itemType: Office.MailboxEnums.ItemType.Appointment,
    expected: false,
  },
  AppointmentConfirmationEnabledTrueAndItemTypeIsMessage: {
    target: {
      to: [],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        AppointmentConfirmationEnabled: true,
        BlockDistributionLists: true,
      }
    },
    itemType: Office.MailboxEnums.ItemType.Message,
    expected: false,
  },
  AppointmentConfirmationEnabledFalseAndItemTypeIsAppointment: {
    target: {
      to: [],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        AppointmentConfirmationEnabled: false,
        BlockDistributionLists: true,
      }
    },
    itemType: Office.MailboxEnums.ItemType.Appointment,
    expected: true,
  },
  AppointmentConfirmationEnabledFalseAndItemTypeIsMessage: {
    target: {
      to: [],
      attachments: [],
    },
    config: {
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles :  {},
      common: {
        AppointmentConfirmationEnabled: false,
        BlockDistributionLists: true,
      }
    },
    itemType: Office.MailboxEnums.ItemType.Message,
    expected: false,
  },
};
export async function test_skipAll({ target, config, itemType, expected }) {
  const data = new ConfirmData({target, config, itemType});
  is(expected, data.skipAll);
}
