/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import { RecipientClassifier } from '../../src/web/recipient-classifier.mjs';
import { assert } from 'tiny-esm-test-runner';
import { OfficeMockObject } from 'office-addin-mock';
const { is } = assert;

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

export function test_format() {
  const recipients = [
    'without-nick@example.com',
    'My Nickname <with-nick@example.com>',
    'address-like-nickname@clear-code.com <address-like-nick@example.com>',
    'domain-must-be-lower-cased@EXAMPLE.com'
  ];
  const classifier = new RecipientClassifier();
  const classified = classifier.classify(recipients);
  is(
    {
      trusted: [],
      untrusted: [
        { recipient: 'without-nick@example.com',
          address:   'without-nick@example.com',
          domain:    'example.com' },
        { recipient: 'My Nickname <with-nick@example.com>',
          address:   'with-nick@example.com',
          domain:    'example.com' },
        { recipient: 'address-like-nickname@clear-code.com <address-like-nick@example.com>',
          address:   'address-like-nick@example.com',
          domain:    'example.com' },
        { recipient: 'domain-must-be-lower-cased@EXAMPLE.com',
          address:   'domain-must-be-lower-cased@EXAMPLE.com',
          domain:    'example.com' }
      ],
      unsafeWithDomain: [],
      unsafe: [],
      distributionLists: [],
      blockWithDomain: [],
      block: [],
      rewarningWithDomain: [],
      rewarning: [],
    },
    classified
  );
}

test_classifyAddresses.parameters = {
  'all recipients must be classified as untrusted for blank list': {
    recipients: [
      'aaa@example.com',
      'bbb@example.com'
    ],
    trustedDomains: [],
    unsafeDomains: {},
    expected: {
      untrusted: [
        'aaa@example.com',
        'bbb@example.com'
      ],
    }
  },
  'all recipients must be classified as trusted based on the list': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@clear-code.com'
    ],
    trustedDomains: ['clear-code.com'],
    unsafeDomains: { 
      'WARNING': ['unsafe.example.com'],
      'BLOCK': ['unsafe.example.com'],
    },
    expected: {
      trusted: [
        'aaa@clear-code.com',
        'bbb@clear-code.com'
      ],
    }
  },
  'all recipients must be classified as untrusted based on the list': {
    recipients: [
      'aaa@example.com',
      'bbb@example.com'
    ],
    trustedDomains: ['clear-code.com'],
    unsafeDomains: {},
    expected: {
      untrusted: [
        'aaa@example.com',
        'bbb@example.com'
      ],
    }
  },
  'all recipients must be classified as unsafe based on the list': {
    recipients: [
      'aaa@unsafe.example.com',
      'bbb+unsafe@example.com',
    ],
    trustedDomains: [],
    unsafeDomains: { 
      "WARNING": [
        'unsafe.example.com',
        '*unsafe@example.com',
      ],
      "BLOCK": [
        'unsafe.example.com',
        '*unsafe@example.com',
      ],
      "REWARNING": [
        'unsafe.example.com',
        '*unsafe@example.com',
      ],
    },
    expected: {
      trusted: [],
      untrusted: [
        'aaa@unsafe.example.com',
        'bbb+unsafe@example.com',
      ],
      unsafeWithDomain: [
        'aaa@unsafe.example.com',
      ],
      unsafe: [
        'bbb+unsafe@example.com',
      ],
      blockWithDomain: [
        'aaa@unsafe.example.com',
      ],
      block: [
        'bbb+unsafe@example.com',
      ],
      distributionLists: [],
      rewarningWithDomain: [
        'aaa@unsafe.example.com',
      ],
      rewarning: [
        'bbb+unsafe@example.com',
      ],
    }
  },
  'mixed recipients must be classified to trusted and untrusted': {
    recipients: [
      'zzz@example.com',
      'aaa@clear-code.com',
      'bbb@example.org',
      'ccc@clear-code.com'
    ],
    trustedDomains: ['clear-code.com'],
    unsafeDomains: {},
    expected: {
      trusted: [
        'aaa@clear-code.com',
        'ccc@clear-code.com'
      ],
      untrusted: [
        'zzz@example.com',
        'bbb@example.org'
      ],
    }
  },
  'mixed recipients must be classified to safe and unsafe': {
    recipients: [
      'zzz@example.com',
      'aaa@clear-code.com',
      'bbb@example.org',
      'ccc@clear-code.com'
    ],
    trustedDomains: ['clear-code.com'],
    unsafeDomains: { 
      "WARNING": [
        'example.com',
        '*c@clear-code.com',
      ],
      "BLOCK": [
        'example.com',
        '*c@clear-code.com',
      ],
      "REWARNING": [
        'example.com',
        '*c@clear-code.com',
      ],
    },
    expected: {
      trusted: [
        'aaa@clear-code.com',
        'ccc@clear-code.com'
      ],
      untrusted: [
        'zzz@example.com',
        'bbb@example.org'
      ],
      unsafeWithDomain: [
        'zzz@example.com',
      ],
      unsafe: [
        'ccc@clear-code.com'
      ],
      blockWithDomain: [
        'zzz@example.com',
      ],
      block: [
        'ccc@clear-code.com'
      ],
      distributionLists: [],
      rewarningWithDomain: [
        'zzz@example.com',
      ],
      rewarning: [
        'ccc@clear-code.com'
      ],
    }
  },
  'unsafe and trusted recipients must be classified to untrusted by UntrustUnsafeRecipients': {
    recipients: [
      'zzz@example.com',
      'aaa@clear-code.com',
      'bbb@example.org',
      'ccc@clear-code.com'
    ],
    trustedDomains: ['clear-code.com'],
    unsafeDomains: { 
      "WARNING": [
        'example.com',
        '*c@clear-code.com',
      ],
      "BLOCK": [
        'example.com',
        '*c@clear-code.com',
      ],
      "REWARNING": [
        'example.com',
        '*c@clear-code.com',
      ],
    },
    commonConfig: {
      UntrustUnsafeRecipients : true,
    },
    expected: {
      trusted: [
        'aaa@clear-code.com',
      ],
      untrusted: [
        'zzz@example.com',
        'bbb@example.org',
        'ccc@clear-code.com',
      ],
      unsafeWithDomain: [
        'zzz@example.com',
      ],
      unsafe: [
        'ccc@clear-code.com'
      ],
      blockWithDomain: [
        'zzz@example.com',
      ],
      block: [
        'ccc@clear-code.com'
      ],
      distributionLists: [],
      rewarningWithDomain: [
        'zzz@example.com',
      ],
      rewarning: [
        'ccc@clear-code.com'
      ],
    }
  },
  'difference of cases in domains must be ignored': {
    recipients: [
      'aaa@CLEAR-code.com',
      'bbb@clear-CODE.com',
      'ccc@ExAmPlE.com',
    ],
    trustedDomains: ['clear-code.com'],
    unsafeDomains: { 
      "WARNING": ['example.com'],
      "BLOCK": ['example.com'],
      "REWARNING": ['example.com'],
    },
    expected: {
      trusted: [
        'aaa@CLEAR-code.com',
        'bbb@clear-CODE.com',
      ],
      untrusted: [
        'ccc@ExAmPlE.com',
      ],
      unsafeWithDomain: [
        'ccc@ExAmPlE.com',
      ],
      blockWithDomain: [
        'ccc@ExAmPlE.com',
      ],
      distributionLists: [],
      rewarningWithDomain: [
        'ccc@ExAmPlE.com',
      ],
    }
  },
  'mistakable recipients must be detected as untrusted': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@unclear-code.com',
      'clear-code.com@example.com',
      'address-like-nick@clear-code.com <ccc@example.com>',
      'address-like-nick@example.com <ddd@clear-code.com>'
    ],
    trustedDomains: ['clear-code.com'],
    unsafeDomains: {},
    expected: {
      trusted: [
        'aaa@clear-code.com',
        'ddd@clear-code.com'
      ],
      untrusted: [
        'bbb@unclear-code.com',
        'clear-code.com@example.com',
        'ccc@example.com'
      ],
    }
  },
  'sub domain must not detected as trusted': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@un.clear-code.com'
    ],
    trustedDomains: ['clear-code.com'],
    unsafeDomains: {},
    expected: {
      trusted: [
        'aaa@clear-code.com'
      ],
      untrusted: [
        'bbb@un.clear-code.com'
      ],
    }
  },
  'upper domain must not detected as trusted': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@un.clear-code.com'
    ],
    trustedDomains: ['un.clear-code.com'],
    unsafeDomains: {},
    expected: {
      trusted: [
        'bbb@un.clear-code.com'
      ],
      untrusted: [
        'aaa@clear-code.com'
      ],
    }
  },
  'accept "@" in domain list': {
    recipients: [
      'aaa@clear-code.com',
      'bbb@example.com'
    ],
    trustedDomains: ['@clear-code.com'],
    unsafeDomains: { 
      "WARNING": ['@example.com'],
      "BLOCK": ['@example.com'],
      "REWARNING": ['@example.com'],
     },
    expected: {
      trusted: [
        'aaa@clear-code.com'
      ],
      untrusted: [
        'bbb@example.com'
      ],
      unsafeWithDomain: [
        'bbb@example.com'
      ],
      blockWithDomain: [
        'bbb@example.com'
      ],
      distributionLists: [],
      rewarningWithDomain: [
        'bbb@example.com'
      ],
    }
  },
  'support comment in domains list': {
    recipients: [
      'aaa@example.com',
      'bbb@example.net',
      'ccc@#example.net',
    ],
    trustedDomains: [
      'example.com',
      '#example.net',
    ],
    unsafeDomains: {
      "WARNING": [
        '#example.net',
        '#*a@example.com',
      ],
      "BLOCK": [
        '#example.net',
        '#*a@example.com',
      ],
      "REWARNING": [
        '#example.net',
        '#*a@example.com',
      ],
    },
    expected: {
      trusted: [
        'aaa@example.com',
      ],
      untrusted: [
        'bbb@example.net',
        'ccc@#example.net',
      ],
    }
  },
  'support negative modifier in domains list': {
    recipients: [
      'aaa@example.com',
      'bbb@example.net',
    ],
    trustedDomains: [
      'example.com',
      '-@example.com',
      'example.net',
      '-example.net',
    ],
    unsafeDomains: { 
      "WARNING": [
        'example.com',
        '-@example.com',
        'example.net',
        '-example.net',
      ],
      "BLOCK": [
        'example.com',
        '-@example.com',
        'example.net',
        '-example.net',
      ],
      "REWARNING": [
        'example.com',
        '-@example.com',
        'example.net',
        '-example.net',
      ],
    },
    expected: {
      untrusted: [
        'aaa@example.com',
        'bbb@example.net',
      ],
    }
  },
  'support wildcards': {
    recipients: [
      'aaa@example.com',
      'aaa@.example.com',
      'aaa@X.example.com',
      'aaa@XX.example.com',
      'bbb@example.net',
      'bbb@.example.net',
      'bbb@X.example.net',
      'bbb@XX.example.net',
      'ccc@example.org',
      'ccc@.example.org',
      'ccc@X.example.org',
      'ccc@XX.example.org',
      'ddd@example.jp',
      'ddd@.example.jp',
      'ddd@X.example.jp',
      'ddd@XX.example.jp',
    ],
    trustedDomains: [
      '*.example.com',
      '?.example.net',
    ],
    unsafeDomains: { 
      "WARNING": [
        '*.example.org',
        '?.example.jp',
      ],
      "BLOCK": [
        '*.example.org',
        '?.example.jp',
      ],
      "REWARNING": [
        '*.example.org',
        '?.example.jp',
      ],
    },
    expected: {
      trusted: [
        'aaa@.example.com',
        'aaa@X.example.com',
        'aaa@XX.example.com',
        'bbb@X.example.net',
      ],
      untrusted: [
        'aaa@example.com',
        'bbb@example.net',
        'bbb@.example.net',
        'bbb@XX.example.net',
        'ccc@example.org',
        'ccc@.example.org',
        'ccc@X.example.org',
        'ccc@XX.example.org',
        'ddd@example.jp',
        'ddd@.example.jp',
        'ddd@X.example.jp',
        'ddd@XX.example.jp',
      ],
      unsafeWithDomain: [
        'ccc@.example.org',
        'ccc@X.example.org',
        'ccc@XX.example.org',
        'ddd@X.example.jp',
      ],
      blockWithDomain: [
        'ccc@.example.org',
        'ccc@X.example.org',
        'ccc@XX.example.org',
        'ddd@X.example.jp',
      ],
      rewarningWithDomain: [
        'ccc@.example.org',
        'ccc@X.example.org',
        'ccc@XX.example.org',
        'ddd@X.example.jp',
      ],
    }
  },
  'support local part': {
    recipients: [
      'aaa.xx@example.com',
      'bbb.yy@example.com',
      'ccc.zz@example.com',
      'ddd@example.com',
    ],
    trustedDomains: [
      '*.xx@example.com',
      '*.yy@example.com',
    ],
    unsafeDomains: { 
      "WARNING": [
        '*d@example.com',
      ],
       "BLOCK": [
        '*d@example.com',
      ],
       "REWARNING": [
        '*d@example.com',
      ],
    },
    expected: {
      trusted: [
        'aaa.xx@example.com',
        'bbb.yy@example.com',
      ],
      untrusted: [
        'ccc.zz@example.com',
        'ddd@example.com',
      ],
      unsafe: [
        'ddd@example.com',
      ],
      block: [
        'ddd@example.com',
      ],
      rewarning: [
        'ddd@example.com',
      ],
    }
  },
  'local part with negative modifier': {
    recipients: [
      'aaa.xx@example.com',
      'bbb.xx@example.com',
      'ccc.yy@example.com',
    ],
    trustedDomains: [
      '*.xx@example.com',
      '-*.xx@example.com',
    ],
    unsafeDomains: { 
      "WARNING": [
        '*.yy@example.com',
        '-*.yy@example.com',
      ],
      "BLOCK": [
        '*.yy@example.com',
        '-*.yy@example.com',
      ],
      "REWARNING": [
        '*.yy@example.com',
        '-*.yy@example.com',
      ],
    },
    expected: {
      untrusted: [
        'aaa.xx@example.com',
        'bbb.xx@example.com',
        'ccc.yy@example.com',
      ],
    }
  },
  'wildcards in both local part and domain part': {
    recipients: [
      'aaa.xx@foo.example.com',
      'bbb.xx@bar.example.com',
      'ccc.zz@bar.example.com',
      'ddd.00@bar.example.net',
    ],
    trustedDomains: [
      '*.xx@*example.com',
    ],
    unsafeDomains: { 
      "WARNING": [
        '*.00@*example.net',
      ],
      "BLOCK": [
        '*.00@*example.net',
      ],
      "REWARNING": [
        '*.00@*example.net',
      ],
    },
    expected: {
      trusted: [
        'aaa.xx@foo.example.com',
        'bbb.xx@bar.example.com',
      ],
      untrusted: [
        'ccc.zz@bar.example.com',
        'ddd.00@bar.example.net',
      ],
      unsafe: [
        'ddd.00@bar.example.net',
      ],
      block: [
        'ddd.00@bar.example.net',
      ],
      rewarning: [
        'ddd.00@bar.example.net',
      ],
    }
  },
  'no domain (distribution list) and block no domain': {
    recipients: [
      'test-group',
    ],
    trustedDomains: [
    ],
    unsafeDomains: {
      "BLOCK": [
        "@", // means no domain
      ],
    },
    expected: {
      untrusted: [
        'test-group',
      ],
      blockWithDomain: [
        'test-group',
      ],
    }
  },
  'no domain (distribution list)': {
    commonConfig: {
      BlockDistributionLists: true,
    },
    recipients: [
      { 
        displayName: 'test-group',
        domain: '',
        address: '', 
        recipientType: global.Office.MailboxEnums.RecipientType.DistributionList
      },
    ],
    trustedDomains: [
    ],
    unsafeDomains: {
    },
    expected: {
      untrusted: [
        '',
      ],
      distributionLists: [
        '',
      ],
    }
  },
};
export function test_classifyAddresses({ recipients, trustedDomains, unsafeDomains, commonConfig, expected }) {
  const classifier = new RecipientClassifier({ trustedDomains, unsafeDomains, commonConfig });
  const classified = classifier.classify(recipients);
  is(
    Object.assign({ trusted: [], untrusted: [], unsafeWithDomain: [], unsafe: [], distributionLists: [], blockWithDomain: [], block: [], rewarningWithDomain: [], rewarning: [] }, expected),
    {
      trusted: classified.trusted.map(recipient => recipient.address),
      untrusted: classified.untrusted.map(recipient => recipient.address),
      unsafeWithDomain: classified.unsafeWithDomain.map(recipient => recipient.address),
      unsafe: classified.unsafe.map(recipient => recipient.address),
      distributionLists: classified.distributionLists.map(recipient => recipient.address),
      blockWithDomain: classified.blockWithDomain.map(recipient => recipient.address),
      block: classified.block.map(recipient => recipient.address),
      rewarningWithDomain: classified.rewarningWithDomain.map(recipient => recipient.address),
      rewarning: classified.rewarning.map(recipient => recipient.address),
    }
  );
}

test_classifyAll.parameters = {
  'multiple slots': {
    params: {
      to: [
        'aaa@example.com',
      ],
      cc: [
        'bbb@example.org',
      ],
      bcc: [
        'ccc@example.net',
      ],
      trustedDomains: ['example.com'],
      unsafeDomains: { 
        "WARNING": ['example.net'],
        "BLOCK": ['example.org'],
        "REWARNING": ['example.org'],
      },
    },
    expected: {
      trusted: [
        { recipient: 'aaa@example.com',
          address: 'aaa@example.com',
          domain: 'example.com',
          type: 'To' },
      ],
      untrusted: [
        { recipient: 'bbb@example.org',
          address: 'bbb@example.org',
          domain: 'example.org',
          type: 'Cc' },
        { recipient: 'ccc@example.net',
          address: 'ccc@example.net',
          domain: 'example.net',
          type: 'Bcc' },
      ],
      unsafeWithDomain: [
        { recipient: 'ccc@example.net',
          address: 'ccc@example.net',
          domain: 'example.net',
          type: 'Bcc' },
      ],
      unsafe: [],
      blockWithDomain: [
        { recipient: 'bbb@example.org',
          address: 'bbb@example.org',
          domain: 'example.org',
          type: 'Cc' }
      ],
      block: [],
      distributionLists: [],
      rewarningWithDomain: [
        { recipient: 'bbb@example.org',
          address: 'bbb@example.org',
          domain: 'example.org',
          type: 'Cc' }
      ],
      rewarning: [],
    }
  },
}
export function test_classifyAll({ params, expected }) {
  is(expected, RecipientClassifier.classifyAll(params));
}
