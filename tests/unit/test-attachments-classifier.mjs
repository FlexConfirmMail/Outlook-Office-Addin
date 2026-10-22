/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import { AttachmentClassifier } from "../../src/web/attachment-classifier.mjs";
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
  const classified = AttachmentClassifier.classify(data);
  is(trustedAttachments, classified.trusted);
  is(unsafeAttachments, classified.unsafe);
  is(blockAttachments, classified.block);
}

test_unsafeMessage.parameters = {
  'no message': {
    attachments: ['Unsafe.txt'],
    unsafeFiles: { "WARNING": ['unsafe'] },
    expected: {
      unsafe: [undefined],
    },
  },
  'message for keyword': {
    attachments: ['Unsafe.txt', 'Secret.txt'],
    unsafeFiles: { "WARNING": ['unsafe = message for unsafe', 'secret'] },
    expected: {
      unsafe: ['message for unsafe', undefined],
    },
  },
  'message can contain "="': {
    attachments: ['Unsafe.txt'],
    unsafeFiles: { "WARNING": ['unsafe = a = b'] },
    expected: {
      unsafe: ['a = b'],
    },
  },
  'message must not be modified': {
    attachments: ['Unsafe.txt'],
    unsafeFiles: { "WARNING": ['UNSAFE = Message For Unsafe'] },
    expected: {
      unsafe: ['Message For Unsafe'],
    },
  },
  'wildcard': {
    attachments: ['【機 密】.txt'],
    unsafeFiles: { "WARNING": ['機*密 = message for confidential files'] },
    expected: {
      unsafe: ['message for confidential files'],
    },
  },
  'escaped "=" in keyword without message': {
    attachments: ['a=b.txt'],
    unsafeFiles: { "WARNING": ['a\\=b'] },
    expected: {
      unsafe: [undefined],
    },
  },
  'escaped "=" in keyword with message': {
    attachments: ['a=b.txt'],
    unsafeFiles: { "WARNING": ['a\\=b = message for a=b'] },
    expected: {
      unsafe: ['message for a=b'],
    },
  },
  'first matched pattern wins': {
    attachments: ['Unsafe.txt'],
    unsafeFiles: { "WARNING": ['unsafe = first', 'unsafe.txt = second'] },
    expected: {
      unsafe: ['first'],
    },
  },
  'pattern with message can be excluded': {
    attachments: ['Unsafe.txt'],
    unsafeFiles: { "WARNING": ['unsafe = message', '-unsafe'] },
    expected: {},
  },
  'messages for each section': {
    attachments: ['Unsafe.txt', 'Blocked.txt', 'Rewarned.txt'],
    unsafeFiles: {
      "WARNING": ['unsafe = warning message'],
      "BLOCK": ['blocked = block message'],
      "REWARNING": ['rewarned = rewarning message'],
    },
    expected: {
      unsafe: ['warning message'],
      block: ['block message'],
      rewarning: ['rewarning message'],
    },
  },
  'messages are not shared between sections': {
    attachments: ['Unsafe.txt'],
    unsafeFiles: {
      "WARNING": ['unsafe = warning message'],
      "BLOCK": ['unsafe'],
      "REWARNING": ['unsafe = rewarning message'],
    },
    expected: {
      unsafe: ['warning message'],
      block: [undefined],
      rewarning: ['rewarning message'],
    },
  },
};
export function test_unsafeMessage({ attachments, unsafeFiles, expected }) {
  const classified = AttachmentClassifier.classify({
    target: { attachments: attachments.map(name => attachment(name)) },
    config: { unsafeFiles },
  });
  is(
    Object.assign({ unsafe: [], block: [], rewarning: [] }, expected),
    {
      unsafe: classified.unsafe.map(attachment => attachment.unsafeMessage),
      block: classified.block.map(attachment => attachment.blockMessage),
      rewarning: classified.rewarning.map(attachment => attachment.rewarningMessage),
    }
  );
}
