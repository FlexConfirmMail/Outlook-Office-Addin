import { RecipientClassifier } from "./recipient-classifier.mjs";
import { AddedDomainsReconfirmation } from "./added-domains-reconfirmation.mjs";
import { AttachmentsConfirmation } from "./attachments-confirmation.mjs";

const addedDomainsReconfirmation = new AddedDomainsReconfirmation();
const attachmentsConfirmation = new AttachmentsConfirmation();

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
    const container = $(`#${idForGroup}`);
    for (const recipient of recipients) {
      const label = `${recipient.type}: ${recipient.address}`;
      appendCheckbox({ container, label });
    }
  }
}

function appendMiscCheckboxes(labels) {
  const container = $("#attachment-and-others");
  for (const label of labels) {
    appendCheckbox({ container, label });
  }
}

function appendMiscWarningCheckboxes(labels) {
  const container = $("#attachment-and-others");
  for (const label of labels) {
    appendCheckbox({
      container,
      label,
      warning: true,
    });
  }
}

function appendCheckbox({ container, id, label, warning }) {
  if (!id) {
    id = generateTempId();
  }
  const extraClasses = new Set();
  if (warning) {
    extraClasses.add("warning");
  }
  container.append(
    `<fluent-checkbox id="${id}" class="check-target ${[...extraClasses].join(
      " "
    )}" onchange="checkboxChanged(this)"></fluent-checkbox>`
  );
  //In order to escape special chars, adding values with the text function.
  $(`#${id}`).text(label);
}

function classifyRecipients({ to, cc, bcc, trustedDomains }) {
  const classifier = new RecipientClassifier({
    trustedDomains: trustedDomains || [],
  });
  const classifiedTo = classifier.classify(to);
  const classifiedCc = classifier.classify(cc);
  const classifiedBcc = classifier.classify(bcc);
  console.log("classified results: ", { classifiedTo, classifiedCc, classifiedBcc });

  return {
    trusted: new Set([
      ...classifiedTo.trusted.map((recipient) => ({ ...recipient, type: "To" })),
      ...classifiedCc.trusted.map((recipient) => ({ ...recipient, type: "Cc" })),
      ...classifiedBcc.trusted.map((recipient) => ({ ...recipient, type: "Bcc" })),
    ]),
    untrusted: new Set([
      ...classifiedTo.untrusted.map((recipient) => ({ ...recipient, type: "To" })),
      ...classifiedCc.untrusted.map((recipient) => ({ ...recipient, type: "Cc" })),
      ...classifiedBcc.untrusted.map((recipient) => ({ ...recipient, type: "Bcc" })),
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

  const groupedByTypeTrusteds = Object.groupBy(classifiedRecipients.trusted, (item) => item.domain);
  appendRecipientCheckboxes($("#trusted-domains"), groupedByTypeTrusteds);
  const groupedByTypeUntrusted = Object.groupBy(classifiedRecipients.untrusted, (item) => item.domain);
  appendRecipientCheckboxes($("#untrusted-domains"), groupedByTypeUntrusted);

  addedDomainsReconfirmation.init(data);
  addedDomainsReconfirmation.initUI(sendStatusToParent);

  attachmentsConfirmation.init(data);
  appendMiscWarningCheckboxes(
    Array.from(
      attachmentsConfirmation.unsafeAttachments,
      (attachment) => `[警告] 注意が必要なファイル名（${attachment.name}）が含まれています。`
    )
  );
  appendMiscCheckboxes(
    Array.from(attachmentsConfirmation.attachments, (attachment) => `[添付ファイル]  ${attachment.name}`)
  );
}
