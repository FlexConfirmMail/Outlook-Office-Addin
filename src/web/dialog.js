import { RecipientClassifier } from "./recipient-classifier.mjs";
import { AddedDomainsReconfirmation } from "./added-domains-reconfirmation.mjs";
import { wildcardToRegexp } from "./wildcard-to-regexp.mjs";

const addedDomainsReconfirmation = new AddedDomainsReconfirmation();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Office.initialize = (reason) => {};

Office.onReady(() => {
  Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, onMessageFromParent);
  sendStatusToParent("ready");
});

let counter = 0;
function generateTempId() {
  return `fcm_temp_${counter++}_${Date.now()}`;
}

function sendStatusToParent(status) {
  const messageObject = { status: status };
  const jsonMessage = JSON.stringify(messageObject);
  Office.context.ui.messageParent(jsonMessage);
}

window.onCheckAllTrusted = () => {
  const checkTargetLength = $("fluent-checkbox.check-target").length;
  const checkedTargetLength = $("fluent-checkbox.check-target.checked").length;
  const toBeCheckedNumber = $("#trusted-domains fluent-checkbox.check-target").not(".checked").length;
  $("#trusted-domains fluent-checkbox.check-target").prop("checked", true);
  const hasUnchecked = checkTargetLength !== checkedTargetLength + toBeCheckedNumber;
  $("#send-button").prop("disabled", hasUnchecked);
};

window.onSend = () => {
  if (addedDomainsReconfirmation.hasNewDomainAddress) {
    addedDomainsReconfirmation.show();
  } else {
    sendStatusToParent("ok");
  }
};

window.onCancel = () => {
  sendStatusToParent("cancel");
};

window.checkboxChanged = (targetElement) => {
  const checkTargetLength = $("fluent-checkbox.check-target").length;
  const checkedTargetLength = $("fluent-checkbox.check-target.checked").length;
  // If the target is currently checked, the target is unchecked after this function and vice versa.
  const adjustmentValue = $(targetElement).hasClass("checked") ? -1 : 1;
  const hasUnchecked = checkTargetLength !== checkedTargetLength + adjustmentValue;
  $("#send-button").prop("disabled", hasUnchecked);
};

function appendRecipientCheckboxes(target, groupedRecipients) {
  for (const [key, recipients] of Object.entries(groupedRecipients)) {
    const idForGroup = generateTempId();
    const idForGroupTitle = generateTempId();
    target.append(`
      <div>
        <h4 id="${idForGroupTitle}"></h4>
        <fluent-stack id=${idForGroup} orientation="vertical" vertical-align="start"></fluent-stack>
      </div>`);
    //In order to escape special chars, adding values with the text function.
    $(`#${idForGroupTitle}`).text(key);
    const targetElement = $(`#${idForGroup}`);
    for (const recipient of recipients) {
      const value = `${recipient.type}: ${recipient.address}`;
      appendCheckbox(targetElement, generateTempId(), value);
    }
  }
}

function appendMiscCheckboxes(labels) {
  const target = $("#attachment-and-others");
  for (const label of labels) {
    appendCheckbox(target, generateTempId(), label);
  }
}

function appendMiscWarningCheckboxes(labels) {
  const target = $("#attachment-and-others");
  for (const label of labels) {
    appendWarningCheckbox(target, generateTempId(), label);
  }
}

function appendCheckbox(target, id, value) {
  target.append(`<fluent-checkbox id="${id}" class="check-target" onchange="checkboxChanged(this)"></fluent-checkbox>`);
  //In order to escape special chars, adding values with the text function.
  $(`#${id}`).text(value);
}

function appendWarningCheckbox(target, id, value) {
  target.append(`<fluent-checkbox id="${id}" class="check-target warning" onchange="checkboxChanged(this)"></fluent-checkbox>`);
  //In order to escape special chars, adding values with the text function.
  $(`#${id}`).text(value);
}

function classifyRecipients({ to, cc, bcc, trustedDomains }) {
  const classifier = new RecipientClassifier({
    internalDomains: trustedDomains || [],
  });
  const classifiedTo = classifier.classify(to);
  const classifiedCc = classifier.classify(cc);
  const classifiedBcc = classifier.classify(bcc);
  console.log("classified results: ", { classifiedTo, classifiedCc, classifiedBcc });

  return {
    internals: new Set([
      ...classifiedTo.internals.map((recipient) => ({ ...recipient, type: "To" })),
      ...classifiedCc.internals.map((recipient) => ({ ...recipient, type: "Cc" })),
      ...classifiedBcc.internals.map((recipient) => ({ ...recipient, type: "Bcc" })),
    ]),
    externals: new Set([
      ...classifiedTo.externals.map((recipient) => ({ ...recipient, type: "To" })),
      ...classifiedCc.externals.map((recipient) => ({ ...recipient, type: "Cc" })),
      ...classifiedBcc.externals.map((recipient) => ({ ...recipient, type: "Bcc" })),
    ]),
  };
}

function onMessageFromParent(arg) {
  const data = JSON.parse(arg.message);

  // The data scheme:
  // data = {
  //         unsafeFiles : null,
  //   target: {
  //     to : [{emailAddress:"mail@example.com"}, ...],
  //     cc : [...],
  //     bcc : [...],
  //     attachments: [{name:"...",size:0,isInline:false}, ...],
  //   },
  //   config: {
  //     trustedDomains : ["example.com", ...],
  //     unsafeDomains : [...],
  //     unsafeFiles : [...],
  //   },
  //   mailId: "FCM_OriginalRecipients_0123",
  //   originalRecipients: {
  //     to : [...],
  //     cc : [...],
  //     bcc : [...],
  //   },
  // }

  console.log(data);
  const to = data.target.to ? data.target.to.map((_) => _.emailAddress) : [];
  const cc = data.target.cc ? data.target.cc.map((_) => _.emailAddress) : [];
  const bcc = data.target.bcc ? data.target.bcc.map((_) => _.emailAddress) : [];
  const trustedDomains = data.config.trustedDomains;

  const classifiedRecipients = classifyRecipients({ to, cc, bcc, trustedDomains });
  console.log(classifiedRecipients);

  const groupedByTypeInternals = Object.groupBy(classifiedRecipients.internals, (item) => item.domain);
  appendRecipientCheckboxes($("#trusted-domains"), groupedByTypeInternals);
  const groupedByTypeExternals = Object.groupBy(classifiedRecipients.externals, (item) => item.domain);
  appendRecipientCheckboxes($("#external-domains"), groupedByTypeExternals);

  addedDomainsReconfirmation.init(data);
  addedDomainsReconfirmation.initUI(sendStatusToParent);

  const attachments = data.target.attachments || [];
  const unsafeFiles = data.config.unsafeFiles || [];
  const unsafeAttachmentMatcher = new RegExp(unsafeFiles.map((pattern) => wildcardToRegexp(pattern)).join("|"));
  const unsafeAttachments = attachments.filter(attachment => unsafeAttachmentMatcher.test(attachment.name));
  appendMiscWarningCheckboxes(unsafeAttachments.map(attachment => `[警告] 注意が必要なファイル名（${attachment.name}）が含まれています。`));
  appendMiscCheckboxes(attachments.map(attachment => `[添付ファイル]  ${attachment.name}`));
}
