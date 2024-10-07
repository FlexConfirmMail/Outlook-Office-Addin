import * as RecipientParser from "./recipient-parser.mjs";
import { RecipientClassifier } from "./recipient-classifier.mjs";

class AddedDomainsReconfirmation {
  hasNewDomainAddress = false;
  initialized = false;

  /**
  * Parse domain and address of resipients.
  * @param {*} recipients
  * @returns Array<{
  *  recipient,
  *  address,
  *  domain,
  * }>
  */
  parse(recipients) {
    if (!recipients) {
      return [];
    }
    return recipients.map((_) => RecipientParser.parse(_.emailAddress));
  }

  init(data) {
    if (this.initialized){
      return;
    }
    this.initialized = true;
    if (!data.originalRecipients) {
      return;
    }
    const originalToDomains = this.parse(data.originalRecipients.to).map((_) => _.domain);
    const originalCcDomains = this.parse(data.originalRecipients.cc).map((_) => _.domain);
    const originalBccDomains = this.parse(data.originalRecipients.bcc).map((_) => _.domain);
    const originalDomains = new Set([...originalToDomains, ...originalCcDomains, ...originalBccDomains]);
    if (originalDomains.size === 0) {
      return;
    }
    const targetToRecipients = this.parse(data.target.to);
    const targetCcRecipients = this.parse(data.target.cc);
    const targetBccRecipients = this.parse(data.target.bcc);
    const targetRecipients = new Set([...targetToRecipients, ...targetCcRecipients, ...targetBccRecipients]);
    const newDomainAddresses = new Set();
    for (const recipient of targetRecipients) {
      if (originalDomains.has(recipient.domain)) {
        continue;
      }
      newDomainAddresses.add(recipient.address);
    }
    this.hasNewDomainAddress = newDomainAddresses.size > 0;
    if (!this.hasNewDomainAddress) {
      return;
    }
    const targetElement = $("#newly-added-domain-address-list");
    for (const address of newDomainAddresses) {
      const divElement = $(`<div></div>`).appendTo(targetElement);
      const strongElement = $(`<strong></strong>`).appendTo(divElement);
      strongElement.text(address);
    }
    window.onSendNewDomain = () => {
      $("#newly-added-domain-address-dialog").prop("hidden", true);
      sendStatusToParent("ok");
    };
    window.onCancelNewDomain = () => {
      $("#newly-added-domain-address-dialog").prop("hidden", true);
    };
  }

  show() {
   $("#newly-added-domain-address-dialog").prop("hidden", false);
  }
}

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

function appendCheckboxes(target, groupedRecipients) {
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

function appendCheckbox(target, id, value) {
  target.append(`<fluent-checkbox id="${id}" class="check-target" onchange="checkboxChanged(this)"></fluent-checkbox>`);
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
  //     target: {
  //         to : null,
  //         cc : null,
  //         bcc : null,
  //     },
  //     config: {
  //         trustedDomains : null,
  //         untrustedDomains : null,
  //         attachments : null,
  //     }
  // }

  console.log(data);
  const to = data.target.to ? data.target.to.map((_) => _.emailAddress) : [];
  const cc = data.target.cc ? data.target.cc.map((_) => _.emailAddress) : [];
  const bcc = data.target.bcc ? data.target.bcc.map((_) => _.emailAddress) : [];
  const trustedDomains = data.config.trustedDomains;

  const classifiedRecipients = classifyRecipients({ to, cc, bcc, trustedDomains });
  console.log(classifiedRecipients);

  const groupedByTypeInternals = Object.groupBy(classifiedRecipients.internals, (item) => item.domain);
  appendCheckboxes($("#trusted-domains"), groupedByTypeInternals);
  const groupedByTypeExternals = Object.groupBy(classifiedRecipients.externals, (item) => item.domain);
  appendCheckboxes($("#untrusted-domains"), groupedByTypeExternals);

  addedDomainsReconfirmation.init(data);
}
