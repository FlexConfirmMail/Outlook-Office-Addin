/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as L10nUtils from "./l10n.mjs";
import { AddedDomainsReconfirmation } from "../../src/web/added-domains-reconfirmation.mjs";
import * as RecipientParser from "../../src/web/recipient-parser.mjs";
import { assert } from 'tiny-esm-test-runner';
const { ok, ng, is } = assert;

let reconfirmation;

export async function setUp() {
  L10nUtils.clear();
  reconfirmation = new AddedDomainsReconfirmation("ja");
  await reconfirmation.ready;
}

function toTarget(address) {
  return { 
    emailAddress: address,
    ...RecipientParser.parse(address),
   };
}

test_shouldReconfirm.parameters = {
  ToAdded: {
    data: {
      target: {
        to : [toTarget("to@example.com"), toTarget("added@example.net")],
        cc : [],
        bcc : [],
      },
      config: {
        trustedDomains : [],
        untrustedDomains : [],
        unsafeFiles : [],
        common: {
          SafeNewDomainsEnabled: true,
        },
      },
      mailId: "FCM_OriginalRecipients_0123",
      originalRecipients: {
        to : [toTarget("to@example.com")],
        cc : [],
        bcc : [],
      },
    },
    domains: ["example.net"],
  },
  CcAdded: {
    data: {
      target: {
        to : [],
        cc : [toTarget("cc@example.com"), toTarget("added@example.net")],
        bcc : [],
      },
      config: {
        trustedDomains : [],
        untrustedDomains : [],
        unsafeFiles : [],
        common: {
          SafeNewDomainsEnabled: true,
        },
      },
      mailId: "FCM_OriginalRecipients_0123",
      originalRecipients: {
        to : [],
        cc : [toTarget("cc@example.com")],
        bcc : [],
      },
    },
    domains: ["example.net"],
  },
  BccAdded: {
    data: {
      target: {
        to : [],
        cc : [],
        bcc : [toTarget("bcc@example.com"), toTarget("added@example.net")],
      },
      config: {
        trustedDomains : [],
        untrustedDomains : [],
        unsafeFiles : [],
        common: {
          SafeNewDomainsEnabled: true,
        },
      },
      mailId: "FCM_OriginalRecipients_0123",
      originalRecipients: {
        to : [],
        cc : [],
        bcc : [toTarget("bcc@example.com")],
      },
    },
    domains: ["example.net"],
  },
  AddedToDifferentTargetTo: {
    data: {
      target: {
        to : [toTarget("added@example.net")],
        cc : [toTarget("cc@example.com")],
        bcc : [],
      },
      config: {
        trustedDomains : [],
        untrustedDomains : [],
        unsafeFiles : [],
        common: {
          SafeNewDomainsEnabled: true,
        },
      },
      mailId: "FCM_OriginalRecipients_0123",
      originalRecipients: {
        to : [],
        cc : [toTarget("cc@example.com")],
        bcc : [],
      },
    },
    domains: ["example.net"],
  },
  AddedToDifferentTargetCc: {
    data: {
      target: {
        to : [toTarget("to@example.com")],
        cc : [toTarget("added@example.net")],
        bcc : [],
      },
      config: {
        trustedDomains : [],
        untrustedDomains : [],
        unsafeFiles : [],
        common: {
          SafeNewDomainsEnabled: true,
        },
      },
      mailId: "FCM_OriginalRecipients_0123",
      originalRecipients: {
        to : [toTarget("to@example.com")],
        cc : [],
        bcc : [],
      },
    },
    domains: ["example.net"],
  },
  AddedToDifferentTargetBcc: {
    data: {
      target: {
        to : [toTarget("to@example.com")],
        cc : [],
        bcc : [toTarget("added@example.net")],
      },
      config: {
        trustedDomains : [],
        untrustedDomains : [],
        unsafeFiles : [],
        common: {
          SafeNewDomainsEnabled: true,
        },
      },
      mailId: "FCM_OriginalRecipients_0123",
      originalRecipients: {
        to : [toTarget("to@example.com")],
        cc : [],
        bcc : [],
      },
    },
    domains: ["example.net"],
  },
  MultipleDomainsAdded: {
    data: {
      target: {
        to : [toTarget("to@example.com"), toTarget("added@example.com")],
        cc : [toTarget("added@example.net")],
        bcc : [toTarget("added@example.org")],
      },
      config: {
        trustedDomains : [],
        untrustedDomains : [],
        unsafeFiles : [],
        common: {
          SafeNewDomainsEnabled: true,
        },
      },
      mailId: "FCM_OriginalRecipients_0123",
      originalRecipients: {
        to : [toTarget("to@example.com")],
        cc : [],
        bcc : [],
      },
    },
    domains: ["example.net", "example.org"],
  },
};
export function test_shouldReconfirm({ data, domains }) {
  reconfirmation.init(data);
  ok(reconfirmation.initialized);
  ok(reconfirmation.needToConfirm);
  is(new Set(domains), reconfirmation.newDomainAddresses);
}

test_shouldNotReconfirm.parameters = {
  NothingAdded: {
    target: {
      to : [toTarget("to@example.com")],
      cc : [toTarget("cc@example.com")],
      bcc : [toTarget("bcc@example.com")],
    },
    config: {
      trustedDomains : [],
      untrustedDomains : [],
      unsafeFiles : [],
      common: {
        SafeNewDomainsEnabled: true,
      },
    },
    mailId: "FCM_OriginalRecipients_0123",
    originalRecipients: {
      to : [toTarget("to@example.com")],
      cc : [toTarget("cc@example.com")],
      bcc : [toTarget("bcc@example.com")],
    },
  },
  ExistingDomainAdded: {
    target: {
      to : [toTarget("to@example.com")],
      cc : [toTarget("added@example.com")],
      bcc : [],
    },
    config: {
      trustedDomains : [],
      untrustedDomains : [],
      unsafeFiles : [],
      common: {
        SafeNewDomainsEnabled: true,
      },
    },
    mailId: "FCM_OriginalRecipients_0123",
    originalRecipients: {
      to : [toTarget("to@example.com")],
      cc : [],
      bcc : [],
    },
  },
  NewlyComposited: {
    target: {
      to : [toTarget("added@example.com")],
      cc : [],
      bcc : [],
    },
    config: {
      trustedDomains : [],
      untrustedDomains : [],
      unsafeFiles : [],
      common: {
        SafeNewDomainsEnabled: true,
      },
    },
    mailId: null,
    originalRecipients: null,
  },
  EditedFromTemplate: {
    target: {
      to : [toTarget("added@example.com")],
      cc : [],
      bcc : [],
    },
    config: {
      trustedDomains : [],
      untrustedDomains : [],
      unsafeFiles : [],
      common: {
        SafeNewDomainsEnabled: true,
      },
    },
    mailId: "FCM_OriginalRecipients_0123",
    originalRecipients: {
      to : [],
      cc : [],
      bcc : [],
    },
  },
  SafeNewDomainsEnabledIsFalse: {
    target: {
      to : [toTarget("to@example.com"), toTarget("added@example.net")],
      cc : [],
      bcc : [],
    },
    config: {
      trustedDomains : [],
      untrustedDomains : [],
      unsafeFiles : [],
      common: {
        SafeNewDomainsEnabled: false,
      },
    },
    mailId: "FCM_OriginalRecipients_0123",
    originalRecipients: {
      to : [toTarget("to@example.com")],
      cc : [],
      bcc : [],
    },
  },
  SafeNewDomainsEnabledIsNotSpecified: {
    target: {
      to : [toTarget("to@example.com"), toTarget("added@example.net")],
      cc : [],
      bcc : [],
    },
    config: {
      trustedDomains : [],
      untrustedDomains : [],
      unsafeFiles : [],
      common: {},
    },
    mailId: "FCM_OriginalRecipients_0123",
    originalRecipients: {
      to : [toTarget("to@example.com")],
      cc : [],
      bcc : [],
    },
  },
};
export function test_shouldNotReconfirm(data) {
  reconfirmation.init(data);
  ok(reconfirmation.initialized);
  ng(reconfirmation.needToConfirm);
  is(new Set(), reconfirmation.newDomainAddresses);
}
