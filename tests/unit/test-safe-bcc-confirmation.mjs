/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as L10nUtils from "./l10n.mjs";
import { SafeBccConfirmation } from "../../src/web/safe-bcc-confirmation.mjs";
import { assert } from "tiny-esm-test-runner";
import { OfficeMockObject } from 'office-addin-mock';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><p>Hello</p>');
global.window = dom.window;
global.document = dom.window.document;

const mockData = {
  host: "outlook", // Outlookの場合必須
  MailboxEnums : {
    ItemType: {
      Message: "message",
      Appointment: "appointment"
    }
  }
};
const officeMock = new OfficeMockObject(mockData);
global.Office = officeMock;

const { ok, ng, is } = assert;

let confirmation;

export async function setUp() {
  L10nUtils.clear();
  confirmation = new SafeBccConfirmation("ja");
  await confirmation.ready;
}

function recipient(address) {
  return {
    recipient: address,
    address,
    domain: address.split("@")[1],
  };
}

test_shouldNotConfirm.parameters = {
  Disabled: {
    data: {
      target: {
        to: [recipient("example@example.com")],
        cc: [recipient("example@example.net")],
        bcc: [],
      },
      config: {
        common: {
          SafeBccEnabled: false,
          SafeBccThreshold: 1,
          SafeBccReconfirmationThreshold: 1,
        },
      },
    },
    itemType: Office.MailboxEnums.ItemType.Message,
  },
  ZeroThreshold: {
    data: {
      target: {
        to: [recipient("example@example.com")],
        cc: [recipient("example@example.net")],
        bcc: [],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccThreshold: 0,
          SafeBccReconfirmationThreshold: 0,
        },
      },
      itemType: Office.MailboxEnums.ItemType.Message,
    },
  },
  LessThanThreshold: {
    data: {
      target: {
        to: [recipient("example@example.com")],
        cc: [],
        bcc: [],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccThreshold: 2,
          SafeBccReconfirmationThreshold: 2,
        },
      },
    },
    itemType: Office.MailboxEnums.ItemType.Message,
  },
  ManyBcc: {
    data: {
      target: {
        to: [],
        cc: [],
        bcc: [
          recipient("example@example.com"),
          recipient("example@example.net"),
        ],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccThreshold: 1,
          SafeBccReconfirmationThreshold: 1,
        },
      },
      itemType: Office.MailboxEnums.ItemType.Message,
    },
  },
  ZeroThresholdAttendee: {
    data: {
      target: {
        requiredAttendees: [recipient("example@example.com")],
        optionalAttendees: [recipient("example@example.net")],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccThreshold: 0,
          SafeBccReconfirmationThreshold: 0,
        },
      },
      itemType: Office.MailboxEnums.ItemType.Appointoment,
    },
  },
  LessThanThresholdAttendee: {
    data: {
      target: {
        requiredAttendees: [recipient("example@example.com")],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccThreshold: 2,
          SafeBccReconfirmationThreshold: 2,
        },
      },
    },
    itemType: Office.MailboxEnums.ItemType.Appointoment,
  },
};
export function test_shouldNotConfirm({ data }) {
  confirmation.init(data);
  ng(confirmation.shouldConfirm);
  ng(confirmation.shouldReconfirm);
  is([], confirmation.warningConfirmationItems);
}

test_shouldConfirm.parameters = {
  MoreThanThreshold: {
    data: {
      target: {
        to: [recipient("example@example.com")],
        cc: [recipient("example@example.net")],
        bcc: [],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccThreshold: 1,
        },
      },
      itemType: Office.MailboxEnums.ItemType.Message,
    },
    warnings: [
      "[警告] To・Ccに1件以上のドメインが含まれています。"
    ],
  },
  EqualsToThreshold: {
    data: {
      target: {
        to: [recipient("example@example.com")],
        cc: [recipient("example@example.net")],
        bcc: [],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccThreshold: 2,
        },
      },
      itemType: Office.MailboxEnums.ItemType.Message
    },
    warnings: [
      "[警告] To・Ccに2件以上のドメインが含まれています。"
    ],
  },
  MoreThanThresholdAttenees: {
    data: {
      target: {
        requiredAttendees: [recipient("example@example.com")],
        optionalAttendees: [recipient("example@example.net")],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccThreshold: 1,
        },
      },
      itemType: Office.MailboxEnums.ItemType.Appointoment,
    },
    warnings: [
      "[警告] 出席者に1件以上のドメインが含まれています。"
    ],
  },
  EqualsToThreshold: {
    data: {
      target: {
        requiredAttendees: [recipient("example@example.com")],
        optionalAttendees: [recipient("example@example.net")],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccThreshold: 2,
        },
      },
      itemType: Office.MailboxEnums.ItemType.Appointoment,
    },
    warnings: [
      "[警告] 出席者に2件以上のドメインが含まれています。"
    ],
  },
};
export function test_shouldConfirm({ data, warnings }) {
  confirmation.init(data);
  ok(confirmation.needToConfirm);
  is(
    warnings.map((label) => ({label})),
    confirmation.warningConfirmationItems
  );
}

test_shouldReconfirm.parameters = {
  MoreThanThreshold: {
    data: {
      target: {
        to: [recipient("example@example.com")],
        cc: [recipient("example@example.net")],
        bcc: [],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccReconfirmationThreshold: 1,
        },
      },
      itemType: Office.MailboxEnums.ItemType.Message,
    },
    textContent: "To・Ccに1件以上のドメインが含まれています。送信してよろしいですか？",
  },
  EqualsToThreshold: {
    data: {
      target: {
        to: [recipient("example@example.com")],
        cc: [recipient("example@example.net")],
        bcc: [],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccReconfirmationThreshold: 2,
        },
      },
      itemType: Office.MailboxEnums.ItemType.Message
    },
    textContent: "To・Ccに2件以上のドメインが含まれています。送信してよろしいですか？",
  },
  MoreThanThresholdAttenees: {
    data: {
      target: {
        requiredAttendees: [recipient("example@example.com")],
        optionalAttendees: [recipient("example@example.net")],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccReconfirmationThreshold: 1,
        },
      },
      itemType: Office.MailboxEnums.ItemType.Appointoment,
    },
    textContent: "出席者に1件以上のドメインが含まれています。送信してよろしいですか？",
  },
  EqualsToThreshold: {
    data: {
      target: {
        requiredAttendees: [recipient("example@example.com")],
        optionalAttendees: [recipient("example@example.net")],
      },
      config: {
        common: {
          SafeBccEnabled: true,
          SafeBccReconfirmationThreshold: 2,
        },
      },
      itemType: Office.MailboxEnums.ItemType.Appointoment,
    },
    textContent: "出席者に2件以上のドメインが含まれています。送信してよろしいですか？",
  },
};
export function test_shouldReconfirm({ data, textContent }) {
  confirmation.init(data);
  ok(confirmation.needToReconfirm);
  is(
    textContent,
    confirmation.generateReconfirmationContentElement().textContent
  );
}