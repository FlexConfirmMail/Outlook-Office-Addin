function parse(recipient) {
  const address = /<([^@]+@[^>]+)>\s*$/.test(recipient) ? RegExp.$1 : recipient;
  const domain = address.split('@')[1].toLowerCase();
  return {
    recipient,
    address,
    domain,
  };
}

class RecipientClassifier {
  constructor({ internalDomains } = {}) {
    const uniquePatterns = new Set(
      (internalDomains || [])
        .filter(pattern => !pattern.startsWith('#')) // reject commented out items
        .map(
          pattern => pattern.toLowerCase()
            .replace(/^(-?)@/, '$1') // delete needless "@" from domain only patterns: "@example.com" => "example.com"
            .replace(/^(-?)(?![^@]+@)/, '$1*@') // normalize to full address patterns: "foo@example.com" => "foo@example.com", "example.com" => "*@example.com"
        )
    );
    const negativeItems = new Set(
      [...uniquePatterns]
        .filter(pattern => pattern.startsWith('-'))
        .map(pattern => pattern.replace(/^-/, ''))
    );
    for (const negativeItem of negativeItems) {
      uniquePatterns.delete(negativeItem);
      uniquePatterns.delete(`-${negativeItem}`);
    }
    this.$internalPatternsMatcher = new RegExp(`^(${[...uniquePatterns].map(pattern => this.$toRegExpSource(pattern)).join('|')})$`, 'i');
    this.classify = this.classify.bind(this);
  }

  $toRegExpSource(source) {
    // https://stackoverflow.com/questions/6300183/sanitize-string-of-regex-characters-before-regexp-build
    const sanitized = source.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&');

    const wildcardAccepted = sanitized.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');

    return wildcardAccepted;
  }

  classify(recipients) {
    const internals = new Set();
    const externals = new Set();

    for (const recipient of recipients) {
      const classifiedRecipient = {
        ...parse(recipient),
      };
      const address = classifiedRecipient.address;
      if (this.$internalPatternsMatcher.test(address))
        internals.add(classifiedRecipient);
      else
        externals.add(classifiedRecipient);
    }

    return {
      internals: Array.from(internals),
      externals: Array.from(externals),
    };
  }
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
Office.initialize = function (reason) {};

Office.onReady(function () {
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

function onCheckAllTrusted() {
  const checkTargetLength = $("fluent-checkbox.check-target").length;
  const checkedTargetLength = $("fluent-checkbox.check-target.checked").length;
  const toBeCheckedNumber = $("#trusted-domains fluent-checkbox.check-target").not('.checked').length;
  $("#trusted-domains fluent-checkbox.check-target").prop('checked', true);
  const hasUnchecked = checkTargetLength !== (checkedTargetLength + toBeCheckedNumber);
  $("#ok-button").prop("disabled", hasUnchecked);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onOk() {
  sendStatusToParent("ok");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onCancel() {
  sendStatusToParent("cancel");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkboxChanged(target_element) {
  const checkTargetLength = $("fluent-checkbox.check-target").length;
  const checkedTargetLength = $("fluent-checkbox.check-target.checked").length;
  // If the target is currently checked, the target is unchecked after this function and vice versa.
  const adjustmentValue = $(target_element).hasClass('checked') ? -1 : 1;
  const hasUnchecked = checkTargetLength !== (checkedTargetLength + adjustmentValue);
  $("#ok-button").prop("disabled", hasUnchecked);
}

function appendCheckboxes(target, groupedRecipients)
{
  for (const key in groupedRecipients)
  {
    const recipients = groupedRecipients[key];
    const idForGroup = generateTempId();
    const idForGroupTitle = generateTempId();
    target.append(`
      <div>
        <h4 id="${idForGroupTitle}"></h4>
        <fluent-stack id=${idForGroup} orientation="vertical" vertical-align="start"></fluent-stack>
      </div>`);
    //In order to escape special chars, adding values with the text function.
    $(`#${idForGroupTitle}`).text(key);
    const targetElement = $(`#${idForGroup}`)
    for(const recipient of recipients){
      appendCheckbox(targetElement, generateTempId(), recipient.address);
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
  console.log('classified results: ', { classifiedTo, classifiedCc, classifiedBcc });

  return {
    internals: new Set([
      ...classifiedTo.internals.map(recipient => ({ ...recipient, type: 'To' })),
      ...classifiedCc.internals.map(recipient => ({ ...recipient, type: 'Cc' })),
      ...classifiedBcc.internals.map(recipient => ({ ...recipient, type: 'Bcc' })),
    ]),
    externals: new Set([
      ...classifiedTo.externals.map(recipient => ({ ...recipient, type: 'To' })),
      ...classifiedCc.externals.map(recipient => ({ ...recipient, type: 'Cc' })),
      ...classifiedBcc.externals.map(recipient => ({ ...recipient, type: 'Bcc' })),
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
  const to = data.target.to ? 
    data.target.to.map((_) => _.emailAddress): 
    [];
  let cc = data.target.cc ?
    data.target.cc.map((_) => _.emailAddress):
    [];
  let bcc = data.target.cc ?
    data.target.bcc.map((_) => _.emailAddress):
    [];
  const trustedDomains = data.config.trustedDomains;

  const classifiedRecipients = classifyRecipients({to, cc, bcc, trustedDomains});
  console.log(classifiedRecipients);

  const groupedByTypeInternals = Object.groupBy(classifiedRecipients.internals, item => item.domain);
  appendCheckboxes($("#trusted-domains"), groupedByTypeInternals);
  const groupedByTypeExternals = Object.groupBy(classifiedRecipients.externals, item => item.domain);
  appendCheckboxes($("#untrusted-domains"), groupedByTypeExternals);
}
