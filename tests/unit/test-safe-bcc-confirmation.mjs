/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as L10nUtils from "./l10n.mjs";
import { SafeBccConfirmation } from "../../src/web/safe-bcc-confirmation.mjs";
import { assert } from "tiny-esm-test-runner";
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
        },
      },
    },
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
        },
      },
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
        },
      },
    },
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
        },
      },
    },
  },
};
export function test_shouldNotConfirm({ data }) {
  confirmation.init(data);
  ng(confirmation.shouldConfirm);
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
    },
    warnings: [
      "[警告] To・Ccに2件以上のドメインが含まれています。"
    ],
  },
};
export function test_shouldConfirm({ data, warnings }) {
  confirmation.init(data);
  ok(confirmation.shouldConfirm);
  is(
    warnings.map((label) => ({label})),
    confirmation.warningConfirmationItems
  );
}
