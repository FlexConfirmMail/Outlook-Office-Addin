/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { Config } from "./config.mjs";
import { L10n } from "./l10n.mjs";

let l10n;
let policyConfig;
let userConfig;
let effectiveConfig;

class Setting {
  static SerializationMode = {
    User: 0,
    Download: 1,
  };
}

Office.onReady(() => {
  if (window !== window.parent) {
    // Inframe mode
    document.documentElement.classList.add("in-frame");
  }
  const language = Office.context.displayLanguage;
  l10n = L10n.get(language);
  l10n.ready.then(() => l10n.translateAll());
  document.documentElement.setAttribute("lang", language);
  policyConfig = Config.createDefaultConfig();
  userConfig = Config.createEmptyConfig();
  effectiveConfig = Config.createEmptyConfig();
  Office.context.ui.addHandlerAsync(
    Office.EventType.DialogParentMessageReceived,
    onMessageFromParent,
    () => {
      sendStatusToParent("ready");
    }
  );
});

function createSectionableArrayConfigComment(config) {
  if (!config) {
    return "";
  }
  let lines = [];
  for (const sectionName of Config.unsafeArraySectionDefs) {
    if (config[sectionName] && config[sectionName].length > 0) {
      lines.push(`[${sectionName}]`);
      lines = lines.concat(config[sectionName]);
    }
  }
  return lines.join("\n# ");
}

function createUnsafeBodiesConfigComment(unsafeBodiesConfig) {
  if (!unsafeBodiesConfig) {
    return "";
  }
  const lines = [];
  for (const sectionName of Object.keys(unsafeBodiesConfig)) {
    if (unsafeBodiesConfig[sectionName] && unsafeBodiesConfig[sectionName] != {}) {
      lines.push(`[${sectionName}]`);
      const section = unsafeBodiesConfig[sectionName];
      for (const [paramName, typeName] of Object.entries(Config.unsafeBodiesParamDefs)) {
        if (section[paramName] == null) {
          continue;
        }
        switch (typeName) {
          case "boolean":
          case "number":
          case "text":
            lines.push(`${paramName}=${section[paramName]}`);
            break;
          case "commaSeparatedValues": {
            lines.push(`${paramName}=${section[paramName].join(",")}`);
            break;
          }
          default:
            break;
        }
      }
    }
  }
  return lines.join("\n# ");
}

// The configs edited in a text area. Everything else is derived from the key:
//   * the text area:       "<key>TextArea"
//   * the messages:        "setting_<key>Policy", "setting_<key>Example" and
//                          "setting_<key>Template"
//   * the configs:         policyConfig["<key>String"] and userConfig["<key>String"]
//   * the fixed parameter: the key with its first letter capitalized
// "createPolicyComment" builds the commented out policy config shown in the
// text area. "downloadSection" is the section declaration to be added before
// the user's config on downloading, when the config has sections.
const TEXT_CONFIGS = {
  trustedDomains: {
    createPolicyComment: () => policyConfig.trustedDomains?.join("\n# ") ?? "",
    downloadSection: null,
  },
  unsafeDomains: {
    createPolicyComment: () => createSectionableArrayConfigComment(policyConfig.unsafeDomains),
    downloadSection: Config.defaultUnsafeDomainsConfigSection,
  },
  unsafeFiles: {
    createPolicyComment: () => createSectionableArrayConfigComment(policyConfig.unsafeFiles),
    downloadSection: Config.defaultUnsafeFilesConfigSection,
  },
  unsafeBodies: {
    createPolicyComment: () => createUnsafeBodiesConfigComment(policyConfig.unsafeBodies),
    downloadSection: null,
  },
};

function getFixedParameterName(key) {
  return `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function createDisplayTextConfig(key) {
  const policyString = TEXT_CONFIGS[key].createPolicyComment();
  const userString = userConfig[`${key}String`];
  if (policyString) {
    return l10n.get(`setting_${key}Policy`, {
      policy: policyString,
      user: userString?.trim() || l10n.get(`setting_${key}Example`),
    });
  }
  if (userString) {
    return userString;
  }
  return l10n.get(`setting_${key}Template`);
}

function serializeTextConfig(key, mode = Setting.SerializationMode.User) {
  const { createPolicyComment, downloadSection } = TEXT_CONFIGS[key];
  let configString = document.getElementById(`${key}TextArea`).value ?? "";
  const policyString = createPolicyComment();
  if (policyString) {
    // The commented out policy config is shown in the text area, but it is not
    // a part of the user's config, thus it must be removed.
    const template = l10n
      .get(`setting_${key}Policy`, {
        policy: policyString,
        user: "",
      })
      .trim();
    configString = configString.replace(template, "");
  }
  if (mode === Setting.SerializationMode.User) {
    return configString.trim();
  }
  // We must add the default section (ex. [WARNING]) just before right (user's) string.
  // We can ommit the default section declaration, so when right ommits it,
  // the right default section may be in the wrong section after merged.
  //
  // If [WARNING] is not added:
  //   left:
  //     [BLOCK]
  //     a@example.com
  //   right:
  //     b@example.com
  //   merged:
  //     [BLOCK]
  //     a@example.com
  //     b@example.com
  //
  // In this case, b@example.com is expected in [WARNING] but in [BLOCK].
  //
  // By adding [WARNING]:
  //   left:
  //     [BLOCK]
  //     a@example.com
  //   right:
  //     b@example.com
  //   merged:
  //     [BLOCK]
  //     a@example.com
  //     [WARNING]
  //     b@example.com
  //
  // In this case, b@example.com is in [WARNING] as expected.
  const sectionDeclaration = downloadSection ? `[${downloadSection}]\n` : "";
  const policyConfigString = policyConfig[`${key}String`].trim();
  return `${policyConfigString}\n\n${sectionDeclaration}${configString.trim()}`.trim();
}

async function onMessageFromParent(arg) {
  if (!arg.message) {
    return;
  }
  const configs = JSON.parse(arg.message);
  console.debug("configs: ", configs);
  if (!configs) {
    return;
  }
  await l10n.ready;
  updateDialogSetting(configs.policy, configs.user);
}

function swapOptionContents(a, b) {
  // Swapping DOM elements doesn't update the listbox's internal state,
  // so swap the contents instead.
  const tmpValue = a.value;
  const tmpText = a.textContent;
  a.value = b.value;
  a.textContent = b.textContent;
  b.value = tmpValue;
  b.textContent = tmpText;
}

function reorderListbox(order) {
  const listbox = document.getElementById("cardOrderList");
  const options = [...listbox.querySelectorAll("fluent-option")];

  order.forEach((value, i) => {
    const sourceIdx = options.findIndex((opt) => opt.value === value);
    if (sourceIdx < 0 || sourceIdx === i) return;
    swapOptionContents(options[i], options[sourceIdx]);
  });
}

function updateDialogSetting(policy, user) {
  policyConfig = policyConfig.merge(policy);
  userConfig = userConfig.merge(user);
  effectiveConfig = effectiveConfig.merge(policyConfig).merge(userConfig);
  console.debug(effectiveConfig);
  const common = effectiveConfig.common;
  const fixedParametersSet = new Set(policyConfig.common.FixedParameters ?? []);
  for (const key of Object.keys(TEXT_CONFIGS)) {
    const textArea = document.getElementById(`${key}TextArea`);
    textArea.value = createDisplayTextConfig(key);
    textArea.disabled = fixedParametersSet.has(getFixedParameterName(key));
  }

  document.getElementById("countEnabled").checked = common.CountEnabled;
  document.getElementById("countEnabled").disabled = fixedParametersSet.has("CountEnabled");
  document.getElementById("countAllowSkip").checked = common.CountAllowSkip;
  document.getElementById("countAllowSkip").disabled = fixedParametersSet.has("CountAllowSkip");
  document.getElementById("safeBccEnabled").checked = common.SafeBccEnabled;
  document.getElementById("safeBccEnabled").disabled = fixedParametersSet.has("SafeBccEnabled");
  document.getElementById("requireCheckSubject").checked = common.RequireCheckSubject;
  document.getElementById("requireCheckSubject").disabled =
    fixedParametersSet.has("RequireCheckSubject");
  document.getElementById("requireCheckBody").checked = common.RequireCheckBody;
  document.getElementById("requireCheckBody").disabled = fixedParametersSet.has("RequireCheckBody");
  document.getElementById("mainSkipIfNoExt").checked = common.MainSkipIfNoExt;
  document.getElementById("mainSkipIfNoExt").disabled = fixedParametersSet.has("MainSkipIfNoExt");
  document.getElementById("countSkipIfNoExt").checked = common.CountSkipIfNoExt;
  document.getElementById("countSkipIfNoExt").disabled = fixedParametersSet.has("CountSkipIfNoExt");
  document.getElementById("untrustUnsafeRecipients").checked = common.UntrustUnsafeRecipients;
  document.getElementById("untrustUnsafeRecipients").disabled =
    fixedParametersSet.has("UntrustUnsafeRecipients");
  document.getElementById("AppointmentConfirmationEnabled").checked =
    common.AppointmentConfirmationEnabled;
  document.getElementById("AppointmentConfirmationEnabled").disabled = fixedParametersSet.has(
    "AppointmentConfirmationEnabled"
  );
  document.getElementById("safeNewDomainsEnabled").checked = common.SafeNewDomainsEnabled;
  document.getElementById("safeNewDomainsEnabled").disabled =
    fixedParametersSet.has("SafeNewDomainsEnabled");
  document.getElementById("countSeconds").value = common.CountSeconds;
  document.getElementById("countSeconds").disabled = fixedParametersSet.has("CountSeconds");
  document.getElementById("safeBccThreshold").value = common.SafeBccThreshold;
  document.getElementById("safeBccThreshold").disabled = fixedParametersSet.has("SafeBccThreshold");
  document.getElementById("bccConversionRecommendationDomainsThreshold").value =
    common.BccConversionRecommendationDomainsThreshold;
  document.getElementById("bccConversionRecommendationDomainsThreshold").disabled =
    fixedParametersSet.has("BccConversionRecommendationDomainsThreshold");
  document.getElementById("safeBccReconfirmationThreshold").value =
    common.SafeBccReconfirmationThreshold;
  document.getElementById("safeBccReconfirmationThreshold").disabled = fixedParametersSet.has(
    "SafeBccReconfirmationThreshold"
  );
  document.getElementById("delayDeliveryEnabled").checked = common.DelayDeliveryEnabled;
  document.getElementById("delayDeliveryEnabled").disabled =
    fixedParametersSet.has("DelayDeliveryEnabled");
  document.getElementById("delayDeliverySeconds").value = common.DelayDeliverySeconds;
  document.getElementById("delayDeliverySeconds").disabled =
    fixedParametersSet.has("DelayDeliverySeconds");
  document.getElementById("convertToBccEnabled").checked = common.ConvertToBccEnabled;
  document.getElementById("convertToBccEnabled").disabled =
    fixedParametersSet.has("ConvertToBccEnabled");
  document.getElementById("convertToBccThreshold").value = common.ConvertToBccThreshold;
  document.getElementById("convertToBccThreshold").disabled =
    fixedParametersSet.has("ConvertToBccThreshold");
  document.getElementById("blockDistributionLists").checked = common.BlockDistributionLists;
  document.getElementById("blockDistributionLists").disabled =
    fixedParametersSet.has("BlockDistributionLists");
  document.getElementById("emphasizeUntrustedToCc").checked = common.EmphasizeUntrustedToCc;
  document.getElementById("emphasizeUntrustedToCc").disabled =
    fixedParametersSet.has("EmphasizeUntrustedToCc");
  document.getElementById("ignoreInlineImageAttachments").checked =
    common.IgnoreInlineImageAttachments;
  document.getElementById("ignoreInlineImageAttachments").disabled = fixedParametersSet.has(
    "IgnoreInlineImageAttachments"
  );
  reorderListbox(common.ConfirmationDialogCardsOrder ?? []);
  if (fixedParametersSet.has("ConfirmationDialogCardsOrder")) {
    const listbox = document.getElementById("cardOrderList");
    listbox.disabled = true;
    listbox.querySelectorAll("fluent-option").forEach((opt) => {
      opt.disabled = true;
    });
    document.getElementById("moveUpButton").disabled = true;
    document.getElementById("moveDownButton").disabled = true;
  }
}

function sendStatusToParent(status) {
  const messageObject = { status: status };
  const jsonMessage = JSON.stringify(messageObject);
  Office.context.ui.messageParent(jsonMessage);
}

function sendConfigToParent(config) {
  const messageObject = { status: "saveUserConfig", config: config };
  const jsonMessage = JSON.stringify(messageObject);
  Office.context.ui.messageParent(jsonMessage);
}

function serializeCommonConfig(mode, opt, cur) {
  if (mode === Setting.SerializationMode.Download) {
    return `${opt}=${cur}\n`;
  }
  const def = policyConfig.common[opt];
  if (Object.hasOwn(userConfig.common, opt) || cur != def) {
    return `${opt}=${cur}\n`;
  }
  return "";
}

function serializeCommonConfigs({ mode = Setting.SerializationMode.User }) {
  const countEnabled = document.getElementById("countEnabled").checked;
  const countAllowSkip = document.getElementById("countAllowSkip").checked;
  const countSeconds = document.getElementById("countSeconds").value;
  const safeBccEnabled = document.getElementById("safeBccEnabled").checked;
  const safeBccThreshold = document.getElementById("safeBccThreshold").value;
  const bccConversionRecommendationDomainsThreshold = document.getElementById(
    "bccConversionRecommendationDomainsThreshold"
  ).value;
  const safeBccReconfirmationThreshold = document.getElementById(
    "safeBccReconfirmationThreshold"
  ).value;
  const safeNewDomainsEnabled = document.getElementById("safeNewDomainsEnabled").checked;
  const requireCheckSubject = document.getElementById("requireCheckSubject").checked;
  const requireCheckBody = document.getElementById("requireCheckBody").checked;
  const mainSkipIfNoExt = document.getElementById("mainSkipIfNoExt").checked;
  const countSkipIfNoExt = document.getElementById("countSkipIfNoExt").checked;
  const untrustUnsafeRecipients = document.getElementById("untrustUnsafeRecipients").checked;
  const appointmentConfirmationEnabled = document.getElementById(
    "AppointmentConfirmationEnabled"
  ).checked;
  const delayDeliveryEnabled = document.getElementById("delayDeliveryEnabled").checked;
  const delayDeliverySeconds = document.getElementById("delayDeliverySeconds").value;
  const convertToBccEnabled = document.getElementById("convertToBccEnabled").checked;
  const convertToBccThreshold = document.getElementById("convertToBccThreshold").value;
  const blockDistributionLists = document.getElementById("blockDistributionLists").checked;
  const emphasizeUntrustedToCc = document.getElementById("emphasizeUntrustedToCc").checked;
  const ignoreInlineImageAttachments = document.getElementById(
    "ignoreInlineImageAttachments"
  ).checked;
  const confirmationDialogCardsOrder = [
    ...document.querySelectorAll("#cardOrderList fluent-option"),
  ]
    .map((opt) => opt.value)
    .join(",");
  let commonConfigString = "";
  commonConfigString += serializeCommonConfig(mode, "CountEnabled", countEnabled);
  commonConfigString += serializeCommonConfig(mode, "CountSeconds", countSeconds);
  commonConfigString += serializeCommonConfig(mode, "CountAllowSkip", countAllowSkip);
  commonConfigString += serializeCommonConfig(mode, "SafeBccEnabled", safeBccEnabled);
  commonConfigString += serializeCommonConfig(mode, "SafeBccThreshold", safeBccThreshold);
  commonConfigString += serializeCommonConfig(
    mode,
    "BccConversionRecommendationDomainsThreshold",
    bccConversionRecommendationDomainsThreshold
  );
  commonConfigString += serializeCommonConfig(
    mode,
    "SafeBccReconfirmationThreshold",
    safeBccReconfirmationThreshold
  );
  commonConfigString += serializeCommonConfig(mode, "SafeNewDomainsEnabled", safeNewDomainsEnabled);
  commonConfigString += serializeCommonConfig(mode, "RequireCheckSubject", requireCheckSubject);
  commonConfigString += serializeCommonConfig(mode, "RequireCheckBody", requireCheckBody);
  commonConfigString += serializeCommonConfig(mode, "MainSkipIfNoExt", mainSkipIfNoExt);
  commonConfigString += serializeCommonConfig(mode, "CountSkipIfNoExt", countSkipIfNoExt);
  commonConfigString += serializeCommonConfig(
    mode,
    "UntrustUnsafeRecipients",
    untrustUnsafeRecipients
  );
  commonConfigString += serializeCommonConfig(
    mode,
    "AppointmentConfirmationEnabled",
    appointmentConfirmationEnabled
  );
  commonConfigString += serializeCommonConfig(mode, "DelayDeliveryEnabled", delayDeliveryEnabled);
  commonConfigString += serializeCommonConfig(mode, "DelayDeliverySeconds", delayDeliverySeconds);
  commonConfigString += serializeCommonConfig(mode, "ConvertToBccEnabled", convertToBccEnabled);
  commonConfigString += serializeCommonConfig(mode, "ConvertToBccThreshold", convertToBccThreshold);
  commonConfigString += serializeCommonConfig(
    mode,
    "BlockDistributionLists",
    blockDistributionLists
  );
  commonConfigString += serializeCommonConfig(
    mode,
    "EmphasizeUntrustedToCc",
    emphasizeUntrustedToCc
  );
  commonConfigString += serializeCommonConfig(
    mode,
    "IgnoreInlineImageAttachments",
    ignoreInlineImageAttachments
  );
  commonConfigString += serializeCommonConfig(
    mode,
    "ConfirmationDialogCardsOrder",
    confirmationDialogCardsOrder
  );
  // FixedParameters is for policy setting.
  // Do not serialize FixedParameters for user setting.
  if (mode === Setting.SerializationMode.Download) {
    const fixedParameters = policyConfig.common.FixedParameters ?? [];
    if (fixedParameters.length > 0) {
      commonConfigString += `FixedParameters=${fixedParameters.join(",")}\n`;
    }
  }
  return commonConfigString;
}

window.onSave = () => {
  console.debug("onSave");
  const mode = Setting.SerializationMode.User;
  const commonString = serializeCommonConfigs({ mode });
  const trustedDomainsString = serializeTextConfig("trustedDomains", mode);
  const unsafeDomainsString = serializeTextConfig("unsafeDomains", mode);
  const unsafeFilesString = serializeTextConfig("unsafeFiles", mode);
  const unsafeBodiesString = serializeTextConfig("unsafeBodies", mode);
  console.debug("commonString: ", commonString);
  console.debug("trustedDomainsString: ", trustedDomainsString);
  console.debug("unsafeDomainsString: ", unsafeDomainsString);
  console.debug("unsafeFilesString: ", unsafeFilesString);
  console.debug("unsafeBodiesString: ", unsafeBodiesString);
  const config = {
    commonString,
    trustedDomainsString,
    unsafeDomainsString,
    unsafeFilesString,
    unsafeBodiesString,
  };
  sendConfigToParent(config);
};

window.onCancel = () => {
  console.debug("onCancel");
  sendStatusToParent("cancel");
};

window.onReset = () => {
  console.debug("onReset");
  const currentPolocyConfig = policyConfig;

  policyConfig = Config.createDefaultConfig();
  userConfig = Config.createEmptyConfig();
  effectiveConfig = Config.createEmptyConfig();
  updateDialogSetting(currentPolocyConfig, userConfig);
};

window.onDownload = () => {
  console.debug("onDownload");
  const mode = Setting.SerializationMode.Download;
  const commonString = serializeCommonConfigs({ mode });
  // Add policy config to downloaded config, because user may want to use policy config as reference when edit downloaded config.
  const trustedDomainsString = serializeTextConfig("trustedDomains", mode);
  const unsafeDomainsString = serializeTextConfig("unsafeDomains", mode);
  const unsafeFilesString = serializeTextConfig("unsafeFiles", mode);
  const unsafeBodiesString = serializeTextConfig("unsafeBodies", mode);
  const targets = [
    {
      name: "Common.txt",
      content: commonString,
    },
    {
      name: "TrustedDomains.txt",
      content: trustedDomainsString,
    },
    {
      name: "UnsafeDomains.txt",
      content: unsafeDomainsString,
    },
    {
      name: "UnsafeFiles.txt",
      content: unsafeFilesString,
    },
    {
      name: "UnsafeBodies.txt",
      content: unsafeBodiesString,
    },
  ];

  // BOM UTF-8
  const bom = "\uFEFF";
  for (const { name, content } of targets) {
    console.log(`Start downloading file: ${name}.`);
    const blob = new Blob([bom + content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`File downloaded successfully: ${name}.`);
  }
};

function moveCard(direction) {
  const listbox = document.getElementById("cardOrderList");
  const options = [...listbox.querySelectorAll("fluent-option")];
  const idx = options.findIndex((_) => _.getAttribute("aria-selected") === "true");
  const targetIdx = idx + direction;
  if (idx < 0 || targetIdx < 0 || targetIdx >= options.length) return;

  swapOptionContents(options[idx], options[targetIdx]);
  options[targetIdx].click();
}

window.onMoveUpCard = () => moveCard(-1);
window.onMoveDownCard = () => moveCard(1);
