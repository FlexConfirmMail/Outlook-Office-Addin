let totalCheckboxCount = 0;

Office.initialize = function (reason) {};

Office.onReady(function () {
  Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, onMessageFromParent);
  sendStatusToParent("ready");
});

function sendStatusToParent(status) {
  const messageObject = { status: status };
  const jsonMessage = JSON.stringify(messageObject);
  Office.context.ui.messageParent(jsonMessage);
}

function onOk() {
  sendStatusToParent("ok");
}

function onCancel() {
  sendStatusToParent("cancel");
}

function checkboxChanged() {
  const checkedCount = $(".check-target:checked").length;
  const isAllBoxChecked = checkedCount === totalCheckboxCount;
  $("#ok-button").prop("disabled", !isAllBoxChecked);
}

function appendCheckbox(target, id, value) {
  target.append(`
    <div class="form-check">
        <input class="form-check-input check-target" type="checkbox" id="${id}" onchange="checkboxChanged()">
        <label class="form-check-label" for="${id}">
        </label>
    </div>`);
  //In order to escape special chars, adding values with the text function.
  $('label[for="' + id + '"]').text(value);
  totalCheckboxCount += 1;
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

  let trustedRecipients = new Set();
  let untrustedRecipients = new Set();
  let matchedAttachments = new Set();

  let recipients = [];
  if (data.target.to) {
    recipients = recipients.concat(data.target.to.map((_) => _.emailAddress));
  }
  if (data.target.cc) {
    recipients = recipients.concat(data.target.cc.map((_) => _.emailAddress));
  }
  if (data.target.bcc) {
    recipients = recipients.concat(data.target.bcc.map((_) => _.emailAddress));
  }

  console.log(recipients);

  if (data.config.trustedDomains) {
    for (const recipient of recipients) {
      let matched = false;
      for (const trustedDomain of data.config.trustedDomains) {
        matched = recipient.indexOf(trustedDomain) >= 0;
        if (matched) {
          break;
        }
      }
      if (matched) {
        trustedRecipients.add(recipient);
      } else {
        untrustedRecipients.add(recipient);
      }
    }
  }

  console.debug(trustedRecipients);
  console.debug(untrustedRecipients);

  if (trustedRecipients.size > 0) {
    //Make id uniq in this page by adding a trailing number.
    //This is a temporary implementation.
    let num = 0;
    for (const trustedRecipient of trustedRecipients) {
      const id = `trusted-${num++}`;
      appendCheckbox($("#trusted-domains"), id, trustedRecipient);
    }
  }

  if (untrustedRecipients.size > 0) {
    let num = 0;
    for (const untrustedRecipient of untrustedRecipients) {
      const id = `untrusted-${num++}`;
      appendCheckbox($("#untrusted-domains"), id, untrustedRecipient);
    }
  }
}
