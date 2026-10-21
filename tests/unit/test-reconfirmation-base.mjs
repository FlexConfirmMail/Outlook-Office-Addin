/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as L10nUtils from "./l10n.mjs";
import {
  ReconfirmationBase,
  RewarningRecipientsReconfirmationBase,
} from "../../src/web/reconfirmation-base.mjs";
import * as RecipientParser from "../../src/web/recipient-parser.mjs";
import { assert } from 'tiny-esm-test-runner';
import { OfficeMockObject } from 'office-addin-mock';
import { JSDOM } from 'jsdom';
const { ok, ng, is } = assert;

const dom = new JSDOM('<!DOCTYPE html><p>Hello</p>');
global.window = dom.window;
global.document = dom.window.document;

global.Office = new OfficeMockObject({
  host: "outlook",
  MailboxEnums: {
    ItemType: {
      Message: "message",
      Appointment: "appointment"
    },
  },
});

// Collects the given targets as they are. "targets" of the data is a list of
// the target itself, or a pair of the target and its custom message.
class TestReconfirmation extends ReconfirmationBase {
  get defaultMessageBefore() {
    return this.locale.get("Reconfirmation_unsafeFiles");
  }

  collectTargets(data) {
    for (const target of data.targets) {
      if (Array.isArray(target)) {
        this.addTargetWithMessage(target[0], target[1]);
      } else {
        this.addTarget(target);
      }
    }
  }
}

class TestRecipientsReconfirmation extends RewarningRecipientsReconfirmationBase {
  get defaultMessageBefore() {
    return this.locale.get("Reconfirmation_unsafeDomains");
  }

  collectTargets(data) {
    for (const recipient of data.recipients) {
      this.addRecipient(recipient, recipient.domain);
    }
  }
}

function recipient(address, extraProperties = {}) {
  return {
    ...RecipientParser.parse(address),
    ...extraProperties,
  };
}

function contentTexts(contentElement) {
  return {
    messageBefore: contentElement.querySelector("p").textContent,
    targets: Array.from(contentElement.querySelectorAll("li strong"), (_) => _.textContent),
    messageAfter: contentElement.querySelectorAll("p")[1].textContent,
  };
}

let reconfirmation;

export async function setUp() {
  L10nUtils.clear();
  reconfirmation = new TestReconfirmation("ja");
  await reconfirmation.ready;
}

export function test_noTarget() {
  reconfirmation.init({ targets: [] });
  ok(reconfirmation.initialized);
  ng(reconfirmation.needToReconfirm);
  is([], reconfirmation.generateReconfirmationContentElements());
}

export function test_initOnlyOnce() {
  reconfirmation.init({ targets: ["first.txt"] });
  reconfirmation.init({ targets: ["second.txt"] });
  is(["first.txt"], Array.from(reconfirmation.targets));
}

export function test_contentElement() {
  reconfirmation.init({ targets: ["secret.txt", "secret.txt", "confidential.txt"] });
  ok(reconfirmation.needToReconfirm);
  const contentElements = reconfirmation.generateReconfirmationContentElements();
  is(1, contentElements.length);
  is(
    {
      messageBefore: "注意が必要な以下のファイルが含まれています。",
      // The same target must be listed only once.
      targets: ["secret.txt", "confidential.txt"],
      messageAfter: "送信してよろしいですか？",
    },
    contentTexts(contentElements[0])
  );
  is("reconfirmation-list", contentElements[0].querySelector("ul").getAttribute("class"));
}

// The targets with the default message must be listed first, and the targets
// with the same custom message must be grouped into one content.
export function test_groupedByMessage() {
  reconfirmation.init({
    targets: [
      ["a.txt", "message for A"],
      "plain.txt",
      ["b.txt", "message for B"],
      ["c.txt", "message for A"],
    ],
  });
  const contentElements = reconfirmation.generateReconfirmationContentElements();
  is(
    [
      { messageBefore: "注意が必要な以下のファイルが含まれています。", targets: ["plain.txt"] },
      { messageBefore: "message for A", targets: ["a.txt", "c.txt"] },
      { messageBefore: "message for B", targets: ["b.txt"] },
    ],
    contentElements.map((contentElement) => {
      const { messageBefore, targets } = contentTexts(contentElement);
      return { messageBefore, targets };
    })
  );
}

test_recipientTarget.parameters = {
  'domain': {
    recipients: [recipient("aaa@example.com")],
    expected: ["example.com"],
  },
  'display name for a recipient without any domain': {
    recipients: [recipient("", { displayName: "test-group" })],
    expected: ["test-group"],
  },
  'unknown for a recipient without any information': {
    recipients: [recipient("")],
    expected: ["Unknown"],
  },
};
export async function test_recipientTarget({ recipients, expected }) {
  const recipientsReconfirmation = new TestRecipientsReconfirmation("ja");
  await recipientsReconfirmation.ready;
  recipientsReconfirmation.init({ recipients });
  is(expected, Array.from(recipientsReconfirmation.targets));
}

export async function test_recipientCustomMessage() {
  const recipientsReconfirmation = new TestRecipientsReconfirmation("ja");
  await recipientsReconfirmation.ready;
  recipientsReconfirmation.init({
    recipients: [
      recipient("aaa@example.com", { rewarningMessage: "${address} は ${domain} 宛です" }),
      recipient("bbb@example.org"),
    ],
  });
  is(["example.org"], Array.from(recipientsReconfirmation.targets));
  is(
    [["aaa@example.com は example.com 宛です", ["example.com"]]],
    Array.from(recipientsReconfirmation.targetsByMessage, ([message, targets]) => [
      message,
      Array.from(targets),
    ])
  );
}
