/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { RewarningRecipientsReconfirmationBase } from "./reconfirmation-base.mjs";

export class UnsafeAddressesReconfirmation extends RewarningRecipientsReconfirmationBase {
  get defaultMessageBefore() {
    return this.locale.get("Reconfirmation_unsafeAddresses");
  }

  collectTargets(data) {
    for (const recipient of data.classified.recipients.rewarning) {
      this.addRecipient(recipient, recipient.address);
    }
  }
}
