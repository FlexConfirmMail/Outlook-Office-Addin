/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import { OfficeDataAccessHelper } from "../../src/web/office-data-access-helper.mjs";
import { assert } from "tiny-esm-test-runner";
const { is, ok } = assert;

// "global.Office" is shared by all test files, thus it must be defined for
// each test instead of on loading this file.
export function setUp() {
  global.Office = {
    AsyncResultStatus: {
      Succeeded: "succeeded",
      Failed: "failed",
    },
    CoercionType: {
      Html: "html",
      Text: "text",
    },
    MailboxEnums: {
      BodyMode: { Full: "full" },
      ItemType: { Message: "message", Appointment: "appointment" },
    },
    context: {
      mailbox: {
        item: {},
      },
    },
  };
}

// Define an Office API which reports the given result to its callback.
// The callback is called asynchronously, as the real Office APIs do.
function defineApi(path, result) {
  const names = path.split(".");
  const method = names.pop();
  let parent = global.Office.context.mailbox.item;
  for (const name of names) {
    parent[name] = parent[name] || {};
    parent = parent[name];
  }
  parent[method] = function (...args) {
    is(parent, this, `${path} must be called as a method`);
    const callback = args[args.length - 1];
    setTimeout(() => callback(result), 0);
  };
}

function succeeded(value) {
  return { status: global.Office.AsyncResultStatus.Succeeded, value };
}

function failed(message = "something wrong") {
  return { status: global.Office.AsyncResultStatus.Failed, error: { message } };
}

// Reject instead of waiting forever, when the promise is never settled.
function withTimeout(promise, milliseconds = 500) {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error("the promise is never settled")), milliseconds);
    }),
  ]);
}

async function rejectedError(promise) {
  try {
    await withTimeout(promise);
  } catch (error) {
    return error;
  }
  return null;
}

export async function test_getTo_succeeded() {
  defineApi("to.getAsync", succeeded([{ displayName: "AAA", emailAddress: "aaa@example.com" }]));
  is(
    [
      {
        displayName: "AAA",
        emailAddress: "aaa@example.com",
        recipient: "aaa@example.com",
        address: "aaa@example.com",
        domain: "example.com",
      },
    ],
    await withTimeout(OfficeDataAccessHelper.getToAsync())
  );
}

export async function test_getTo_failed() {
  defineApi("to.getAsync", failed("cannot get To"));
  const error = await rejectedError(OfficeDataAccessHelper.getToAsync());
  is("cannot get To", error?.message);
}

// The value is unavailable on a failure. Such a broken result raised an
// exception in the callback, and the promise was never settled before, because
// the callback is called asynchronously and the exception was never caught.
export async function test_getTo_brokenResult() {
  defineApi("to.getAsync", { status: global.Office.AsyncResultStatus.Succeeded });
  const error = await rejectedError(OfficeDataAccessHelper.getToAsync());
  ok(error instanceof TypeError);
}

export async function test_getAttachments_succeeded() {
  defineApi(
    "getAttachmentsAsync",
    succeeded([
      { name: "attached.txt", attachmentType: "file" },
      { name: "inline.png", attachmentType: "inline" },
    ])
  );
  is(
    [{ name: "attached.txt", attachmentType: "file" }],
    await withTimeout(OfficeDataAccessHelper.getAttachmentsAsync())
  );
}

export async function test_getAttachments_brokenResult() {
  defineApi("getAttachmentsAsync", { status: global.Office.AsyncResultStatus.Succeeded });
  ok((await rejectedError(OfficeDataAccessHelper.getAttachmentsAsync())) instanceof TypeError);
}

// The id is unavailable for a new appointment on classic Outlook, thus it must
// be resolved with no value instead of rejected.
export async function test_getItemId_failed() {
  defineApi("getItemIdAsync", failed());
  is(undefined, await withTimeout(OfficeDataAccessHelper.getItemIdAsync()));
}

export async function test_getSubject_failed() {
  defineApi("subject.getAsync", failed());
  is(undefined, await withTimeout(OfficeDataAccessHelper.getSubjectAsync()));
}

export async function test_getSessionData_succeeded() {
  defineApi("sessionData.getAsync", succeeded("stored value"));
  is("stored value", await withTimeout(OfficeDataAccessHelper.getSessionDataAsync("key")));
}

// A missing key is reported as a failure, and it must be regarded as no value.
export async function test_getSessionData_failed() {
  defineApi("sessionData.getAsync", failed());
  is("", await withTimeout(OfficeDataAccessHelper.getSessionDataAsync("key")));
}

export async function test_setSessionData() {
  defineApi("sessionData.setAsync", succeeded());
  is(true, await withTimeout(OfficeDataAccessHelper.setSessionDataAsync("key", "value")));
  defineApi("sessionData.setAsync", failed());
  is(false, await withTimeout(OfficeDataAccessHelper.setSessionDataAsync("key", "value")));
}

export async function test_setTo() {
  const recipients = ["aaa@example.com"];
  defineApi("to.setAsync", succeeded());
  is(recipients, await withTimeout(OfficeDataAccessHelper.setToAsync(recipients)));
  defineApi("to.setAsync", failed("cannot set To"));
  const error = await rejectedError(OfficeDataAccessHelper.setToAsync(recipients));
  is("cannot set To", error?.message);
}

// An Office API raises an exception synchronously when it is unsupported.
export async function test_unsupportedApi() {
  global.Office.context.mailbox.item.delayDeliveryTime = null;
  ok((await rejectedError(OfficeDataAccessHelper.getDelayDeliveryTime())) !== null);
}
