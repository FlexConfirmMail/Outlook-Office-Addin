/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { ReconfirmationBase } from "./reconfirmation-base.mjs";

export class UnsafeFilesReconfirmation extends ReconfirmationBase {
  get defaultMessageBefore() {
    return this.locale.get("Reconfirmation_unsafeFiles");
  }

  collectTargets(data) {
    for (const attachment of data.classified.attachments.rewarning) {
      this.addTarget(attachment.name);
    }
  }
}
