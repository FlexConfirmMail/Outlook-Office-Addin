/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import { AttachmentsConfirmation } from "../../src/web/attachments-confirmation.mjs";
import { assert } from "tiny-esm-test-runner";
const { is } = assert;

function attachment(name) {
  return { name };
}

test_classify.parameters = {
  BlankInput: {
    data: {
      target: {
        attachments: [],
      },
      config: {
        unsafeFiles : [],
      },
    },
    attachments: [],
    unsafeAttachments: [],
  },
  BlankInputWithUnsafeFiles: {
    data: {
      target: {
        attachments: [],
      },
      config: {
        unsafeFiles : [
          "unsafe",
        ],
      },
    },
    attachments: [],
    unsafeAttachments: [],
  },
  WithNoUnsafeFiles: {
    data: {
      target: {
        attachments: [
          attachment("Safe.txt"),
          attachment("Unsafe.txt"),
        ],
      },
      config: {
        unsafeFiles : [],
      },
    },
    attachments: [
      attachment("Safe.txt"),
      attachment("Unsafe.txt"),
    ],
    unsafeAttachments: [],
  },
  WithUnsafeFiles: {
    data: {
      target: {
        attachments: [
          attachment("Safe.txt"),
          attachment("Unsafe.txt"),
        ],
      },
      config: {
        unsafeFiles : [
          "unsafe",
          "#safe",
          "-safe",
        ],
      },
    },
    attachments: [
      attachment("Safe.txt"),
      attachment("Unsafe.txt"),
    ],
    unsafeAttachments: [
      attachment("Unsafe.txt"),
    ],
  },
  WithMultipleUnsafeFiles: {
    data: {
      target: {
        attachments: [
          attachment("Safe.txt"),
          attachment("Unsafe.txt"),
          attachment("Zipped.ZIP"),
          attachment("【機密】.txt"),
          attachment("【機 密】.txt"),
        ],
      },
      config: {
        unsafeFiles : [
          "unsafe",
          ".zip",
          "機*密",
        ],
      },
    },
    attachments: [
      attachment("Safe.txt"),
      attachment("Unsafe.txt"),
      attachment("Zipped.ZIP"),
      attachment("【機密】.txt"),
      attachment("【機 密】.txt"),
    ],
    unsafeAttachments: [
      attachment("Unsafe.txt"),
      attachment("Zipped.ZIP"),
      attachment("【機密】.txt"),
      attachment("【機 密】.txt"),
    ],
  },
};
export function test_classify({ data, attachments, unsafeAttachments }) {
  const confirmation = new AttachmentsConfirmation();
  confirmation.init(data);
  is(attachments, [...confirmation.attachments]);
  is(unsafeAttachments, [...confirmation.unsafeAttachments]);
}
