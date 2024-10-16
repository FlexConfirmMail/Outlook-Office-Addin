/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import { promises as fs } from "fs";
import { fileURLToPath } from "url";

import { L10n } from "../../src/web/l10n.mjs";

// Node.js v20 does not support fetch() for File URLs...
L10n.JSONFetcher = async (url) => {
  const fileUrl = new URL(url);
  const path = fileURLToPath(fileUrl);
  try {
    const data = await fs.readFile(path, "utf8");
    if (data) {
      return JSON.parse(data);
    }
  }
  catch(error) {
    //console.error(error);
  }
  return null;
};

L10n.baseUrl = (new URL(`${import.meta.url}/../../../`)).toString();
