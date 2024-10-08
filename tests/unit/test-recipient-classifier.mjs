/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import { RecipientClassifier } from '../../src/web/recipient-classifier.mjs';
import { assert } from 'tiny-esm-test-runner';
const { is } = assert;

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
    expected: {
      trusted: [],
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
    expected: {
      trusted: [
        'aaa@clear-code.com',
        'bbb@clear-code.com'
      ],
      untrusted: [],
    }
  },
  'all recipients must be classified as untrusted based on the list': {
    recipients: [
      'aaa@example.com',
      'bbb@example.com'
    ],
    trustedDomains: ['clear-code.com'],
    expected: {
      trusted: [],
      untrusted: [
        'aaa@example.com',
        'bbb@example.com'
      ],
    }
  },
  'mixed recipients must be classified to trusted and untrusted': {
    recipients: [
      'zzz@exmaple.com',
      'aaa@clear-code.com',
      'bbb@example.org',
      'ccc@clear-code.com'
    ],
    trustedDomains: ['clear-code.com'],
    expected: {
      trusted: [
        'aaa@clear-code.com',
        'ccc@clear-code.com'
      ],
      untrusted: [
        'zzz@exmaple.com',
        'bbb@example.org'
      ],
    }
  },
  'difference of cases in domains must be ignored': {
    recipients: [
      'aaa@CLEAR-code.com',
      'bbb@clear-CODE.com'
    ],
    trustedDomains: ['clear-code.com'],
    expected: {
      trusted: [
        'aaa@CLEAR-code.com',
        'bbb@clear-CODE.com'
      ],
      untrusted: [],
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
    expected: {
      trusted: [
        'aaa@clear-code.com'
      ],
      untrusted: [
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
    expected: {
      trusted: [
      ],
      untrusted: [
        'aaa@example.com',
        'bbb@example.net',
      ],
    }
  },
  'support wildcards': {
    recipients: [
      'aaa@.example.com',
      'aaa@X.example.com',
      'aaa@XX.example.com',
      'bbb@.example.net',
      'bbb@X.example.net',
      'bbb@XX.example.net',
    ],
    trustedDomains: [
      '*.example.com',
      '?.example.net',
    ],
    expected: {
      trusted: [
        'aaa@.example.com',
        'aaa@X.example.com',
        'aaa@XX.example.com',
        'bbb@X.example.net',
      ],
      untrusted: [
        'bbb@.example.net',
        'bbb@XX.example.net',
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
    expected: {
      trusted: [
        'aaa.xx@example.com',
        'bbb.yy@example.com',
      ],
      untrusted: [
        'ccc.zz@example.com',
        'ddd@example.com',
      ],
    }
  },
  'local part with negative modifier': {
    recipients: [
      'aaa.xx@example.com',
      'bbb.xx@example.com',
    ],
    trustedDomains: [
      '*.xx@example.com',
      '-*.xx@example.com',
    ],
    expected: {
      trusted: [
      ],
      untrusted: [
        'aaa.xx@example.com',
        'bbb.xx@example.com',
      ],
    }
  },
  'wildcards in both local part and domain part': {
    recipients: [
      'aaa.xx@foo.example.com',
      'bbb.xx@bar.example.com',
      'ccc.zz@bar.example.com',
    ],
    trustedDomains: [
      '*.xx@*example.com',
    ],
    expected: {
      trusted: [
        'aaa.xx@foo.example.com',
        'bbb.xx@bar.example.com',
      ],
      untrusted: [
        'ccc.zz@bar.example.com',
      ],
    }
  },
};
export function test_classifyAddresses({ recipients, trustedDomains, expected }) {
  const classifier = new RecipientClassifier({ trustedDomains });
  const classified = classifier.classify(recipients);
  is(
    expected,
    {
      trusted: classified.trusted.map(recipient => recipient.address),
      untrusted: classified.untrusted.map(recipient => recipient.address),
    }
  );
}
