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
    warnings: [],
    confirmations: [],
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
    warnings: [],
    confirmations: [],
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
    warnings: [],
    confirmations: [
      "[添付ファイル]  Safe.txt",
      "[添付ファイル]  Unsafe.txt",
    ],
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
    warnings: [
      "[警告] 注意が必要なファイル名（Unsafe.txt）が含まれています。",
    ],
    confirmations: [
      "[添付ファイル]  Safe.txt",
      "[添付ファイル]  Unsafe.txt",
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
    warnings: [
      "[警告] 注意が必要なファイル名（Unsafe.txt）が含まれています。",
      "[警告] 注意が必要なファイル名（Zipped.ZIP）が含まれています。",
      "[警告] 注意が必要なファイル名（【機密】.txt）が含まれています。",
      "[警告] 注意が必要なファイル名（【機 密】.txt）が含まれています。",
    ],
    confirmations: [
      "[添付ファイル]  Safe.txt",
      "[添付ファイル]  Unsafe.txt",
      "[添付ファイル]  Zipped.ZIP",
      "[添付ファイル]  【機密】.txt",
      "[添付ファイル]  【機 密】.txt",
    ],
  },
};
export function test_classify({ data, attachments, unsafeAttachments, warnings, confirmations }) {
  const confirmation = new AttachmentsConfirmation();
  confirmation.init(data);
  is(attachments, [...confirmation.attachments]);
  is(unsafeAttachments, [...confirmation.unsafeAttachments]);
  is(
    warnings.map((label) => ({label})),
    confirmation.warningConfirmationItems
  );
  is(
    confirmations.map((label) => ({label})),
    confirmation.confirmationItems
  );
}
