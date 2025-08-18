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
        unsafeFiles : {},
      },
    },
    trustedAttachments: [],
    unsafeAttachments: [],
    blockAttachments: [],
  },
  BlankInputWithUnsafeFiles: {
    data: {
      target: {
        attachments: [],
      },
      config: {
        unsafeFiles : { 
          "WARNING": [
            "unsafe",
        ]},
      },
    },
    trustedAttachments: [],
    unsafeAttachments: [],
    blockAttachments: [],
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
        unsafeFiles : {},
      },
    },
    trustedAttachments: [
      attachment("Safe.txt"),
      attachment("Unsafe.txt"),
    ],
    unsafeAttachments: [],
    blockAttachments: [],
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
        unsafeFiles :  { 
          "WARNING": [
            "unsafe",
            "#safe",
            "-safe",
        ]},
      },
    },
    trustedAttachments: [
      attachment("Safe.txt"),
    ],
    unsafeAttachments: [
      attachment("Unsafe.txt"),
    ],
    blockAttachments: [],
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
        unsafeFiles :  { 
          "WARNING":[
            "unsafe",
            ".zip",
            "機*密",
        ]},
      },
    },
    trustedAttachments: [
      attachment("Safe.txt"),
    ],
    unsafeAttachments: [
      attachment("Unsafe.txt"),
      attachment("Zipped.ZIP"),
      attachment("【機密】.txt"),
      attachment("【機 密】.txt"),
    ],
    blockAttachments: [],
  },
  WithMultipleBlockFiles: {
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
        unsafeFiles :  { 
          "BLOCK":[
            "unsafe",
            ".zip",
            "機*密",
        ]},
      },
    },
    trustedAttachments: [
      attachment("Safe.txt"),
    ],
    unsafeAttachments: [],
    blockAttachments: [
      attachment("Unsafe.txt"),
      attachment("Zipped.ZIP"),
      attachment("【機密】.txt"),
      attachment("【機 密】.txt"),
    ],
  },
};
export function test_classify({ data, trustedAttachments, unsafeAttachments, blockAttachments }) {
  const classified = AttachmentsConfirmation.classify(data);
  is(trustedAttachments, classified.trusted);
  is(unsafeAttachments, classified.unsafe);
  is(blockAttachments, classified.block);
}
