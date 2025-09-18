/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as L10nUtils from "./l10n.mjs";
import { UnsafeBodiesConfirmation } from "../../src/web/unsafe-bodies-confirmation.mjs";
import { assert } from "tiny-esm-test-runner";

const { ok, ng, is } = assert;

let confirmation;

export async function setUp() {
  L10nUtils.clear();
  confirmation = new UnsafeBodiesConfirmation("ja");
  await confirmation.ready;
}

test_notConfirm.parameters = {
  NotMatchKeywords: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "部外秘" ],
            "WarningType": "WARNING",
            "Language": "ja",
            "Message": "部外秘を含んでいます。"
          }
        }
      },
    },
  },
  NotMatchLanguage: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "WARNING",
            "Language": "en",
            "Message": "社外秘を含んでいます。"
          }
        }
      },
    },
  },
  NoBody: {
    data: {
      target: {
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "WARNING",
            "Language": "en",
            "Message": "社外秘を含んでいます。"
          }
        }
      },
    },
  },
  EmptyBody: {
    data: {
      target: {
        bodyText: ""
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "WARNING",
            "Language": "en",
            "Message": "社外秘を含んでいます。"
          }
        }
      },
    },
  },
  NullBody: {
    data: {
      target: {
        bodyText: null
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "WARNING",
            "Language": "en",
            "Message": "社外秘を含んでいます。"
          }
        }
      },
    },
  },
};
export function test_notConfirm({ data }) {
  confirmation.init(data);
  ng(confirmation.needToConfirm);
  ng(confirmation.needToReconfirm);
  ng(confirmation.needToBlock);
}

test_needToConfirm.parameters = {
  MatchSingle: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "WARNING",
            "Language": "ja",
            "Message": "社外秘を含んでいます。"
          }
        }
      },
    },
    warnings: [
      "社外秘を含んでいます。"
    ],
  },
  MatchWithMultipleKeywords: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "部外秘" , "社外秘" ],
            "WarningType": "WARNING",
            "Language": "ja",
            "Message": "部外秘か社外秘を含んでいます。"
          },
        }
      },
    },
    warnings: [
      "部外秘か社外秘を含んでいます。"
    ],
  },
  MatchMultipleDefinision: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "WARNING",
            "Language": "ja",
            "Message": "社外秘を含んでいます。"
          },
          "TEST2" : {
            "Keywords": [ "本文" ],
            "WarningType": "WARNING",
            "Language": "ja",
            "Message": "本文を含んでいます。"
          }
        }
      },
    },
    warnings: [
      "社外秘を含んでいます。",
      "本文を含んでいます。"
    ],
  },
  MatchWithoutLanguage: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "WARNING",
            "Message": "社外秘を含んでいます。"
          }
        }
      },
    },
    warnings: [
      "社外秘を含んでいます。"
    ],
  },
};
export function test_needToConfirm({ data, warnings }) {
  confirmation.init(data);
  ok(confirmation.needToConfirm);
  is(
    warnings,
    confirmation.warningConfirmationItems
  );
}

test_needToReconfirm.parameters = {
  MatchSingle: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "REWARNING",
            "Language": "ja",
            "Message": "社外秘を含んでいます。"
          }
        }
      },
    },
    warnings: [
      "社外秘を含んでいます。送信してよろしいですか？"
    ],
  },
  MatchWithMultipleKeywords: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "部外秘" , "社外秘" ],
            "WarningType": "REWARNING",
            "Language": "ja",
            "Message": "部外秘か社外秘を含んでいます。"
          },
        }
      },
    },
    warnings: [
      "部外秘か社外秘を含んでいます。送信してよろしいですか？"
    ],
  },
  MatchMultipleDefinision: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "REWARNING",
            "Language": "ja",
            "Message": "社外秘を含んでいます。"
          },
          "TEST2" : {
            "Keywords": [ "本文" ],
            "WarningType": "REWARNING",
            "Language": "ja",
            "Message": "本文を含んでいます。"
          }
        }
      },
    },
    warnings: [
      "社外秘を含んでいます。送信してよろしいですか？",
      "本文を含んでいます。送信してよろしいですか？"
    ],
  },
  MatchWithoutLanguage: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "REWARNING",
            "Message": "社外秘を含んでいます。"
          }
        }
      },
    },
    warnings: [
      "社外秘を含んでいます。送信してよろしいですか？"
    ],
  },
};
export function test_needToReconfirm({ data, warnings }) {
  confirmation.init(data);
  ok(confirmation.needToReconfirm);
  is(
    warnings,
    confirmation.generateReconfirmationContentElements().map(content => content.textContent)
  );
}

test_needToBlock.parameters = {
  MatchSingle: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "BLOCK",
            "Language": "ja",
          }
        }
      },
    },
    blockTargetWords: [
      "社外秘"
    ],
  },
  MatchWithMultipleKeywords: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "本文" , "社外秘" ],
            "WarningType": "BLOCK",
            "Language": "ja",
          },
        }
      },
    },
    blockTargetWords: [
      "社外秘",
      "本文"
    ],
  },
  MatchMultipleDefinision: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "BLOCK",
            "Language": "ja",
          },
          "TEST2" : {
            "Keywords": [ "本文" ],
            "WarningType": "BLOCK",
            "Language": "ja",
          }
        }
      },
    },
    blockTargetWords: [
      "社外秘",
      "本文"
    ],
  },
  MatchWithoutLanguage: {
    data: {
      target: {
        bodyText: "社外秘の本文"
      },
      config: {
        unsafeBodies: {
          "TEST" : {
            "Keywords": [ "社外秘" ],
            "WarningType": "BLOCK",
          }
        }
      },
    },
    blockTargetWords: [
      "社外秘"
    ],
  },
};
export function test_needToBlock({ data, blockTargetWords }) {
  confirmation.init(data);
  ok(confirmation.needToBlock);
  is(
    blockTargetWords,
    confirmation.blockTargetWords
  );
}