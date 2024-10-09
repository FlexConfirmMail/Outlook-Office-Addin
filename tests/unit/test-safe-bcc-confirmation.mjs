/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import { SafeBccConfirmation } from "../../src/web/safe-bcc-confirmation.mjs";
import { assert } from "tiny-esm-test-runner";
const { ok, ng, is } = assert;

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
  const confirmation = new SafeBccConfirmation();
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
    expectedWarningConfirmations: [
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
    expectedWarningConfirmations: [
      "[警告] To・Ccに2件以上のドメインが含まれています。"
    ],
  },
};
export function test_shouldConfirm({ data, expectedWarningConfirmations }) {
  const confirmation = new SafeBccConfirmation();
  confirmation.init(data);
  ok(confirmation.shouldConfirm);
  is(
    expectedWarningConfirmations.map((label) => ({label})),
    confirmation.warningConfirmationItems
  );
}
