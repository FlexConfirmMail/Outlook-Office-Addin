import * as RecipientParser from "./recipient-parser.mjs";

export class AddedDomainsReconfirmation {
  needToConfirm = false;
  newDomainAddresses = new Set();
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
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    if (!data.config.common.SafeNewDomainsEnabled) {
      return;
    }
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
    for (const recipient of targetRecipients) {
      if (originalDomains.has(recipient.domain)) {
        continue;
      }
      this.newDomainAddresses.add(recipient.address);
    }
    this.needToConfirm = this.newDomainAddresses.size > 0;
    if (!this.needToConfirm) {
      return;
    }
  }

  initUI(sendStatusToParent) {
    const targetElement = $("#newly-added-domain-address-list");
    for (const address of this.newDomainAddresses) {
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
