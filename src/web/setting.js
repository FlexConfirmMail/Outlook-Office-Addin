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

Office.onReady(() => {
  if (window !== window.parent) {
    // Inframe mode
    document.documentElement.classList.add("in-frame");
  }
  Office.context.ui.addHandlerAsync(
    Office.EventType.DialogParentMessageReceived,
    onMessageFromParent
  );
  const language = Office.context.displayLanguage;
  l10n = L10n.get(language);
  l10n.ready.then(() => l10n.translateAll());
  document.documentElement.setAttribute("lang", language);
  policyConfig = Config.createDefaultConfig();
  userConfig = Config.createEmptyConfig();
  effectiveConfig = Config.createEmptyConfig();
  sendStatusToParent("ready");
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

function createDisplayTrustedDomains() {
  if (policyConfig.trustedDomains && policyConfig.trustedDomains.length > 0) {
    const policyDomainsString = policyConfig.trustedDomains?.join("\n# ") ?? "";
    let userDomainsString = userConfig.trustedDomainsString?.trim() ?? "";
    if (!userDomainsString) {
      userDomainsString = l10n.get("setting_trustedDomainsExample");
    }
    return l10n.get("setting_trustedDomainsPolicy", {
      policy: policyDomainsString,
      user: userDomainsString,
    });
  } else if (userConfig.trustedDomainsString) {
    return userConfig.trustedDomainsString;
  } else {
    return l10n.get("setting_trustedDomainsTemplate");
  }
}

function serializeTrustedDomains() {
  let trustedDomainsString = document.getElementById("trustedDomainsTextArea").value ?? "";
  if (policyConfig.trustedDomains && policyConfig.trustedDomains.length > 0) {
    const policyDomainsString = policyConfig.trustedDomains?.join("\n# ") ?? "";
    const template = l10n
      .get("setting_trustedDomainsPolicy", {
        policy: policyDomainsString,
        user: "",
      })
      .trim();
    trustedDomainsString = trustedDomainsString.replace(template, "");
  }
  trustedDomainsString = trustedDomainsString.trim();
  return trustedDomainsString;
}

function createDisplayUnsafeDomains() {
  const policyUnsafeDomainsString = createSectionableArrayConfigComment(
    policyConfig.unsafeDomains,
    Config.defaultUnsafeDomainsConfigSection
  );
  if (policyUnsafeDomainsString) {
    let userUnsafeDomainsString = userConfig.unsafeDomainsString?.trim() ?? "";
    if (!userUnsafeDomainsString) {
      userUnsafeDomainsString = l10n.get("setting_unsafeDomainsExample");
    }
    return l10n.get("setting_unsafeDomainsPolicy", {
      policy: policyUnsafeDomainsString,
      user: userUnsafeDomainsString,
    });
  } else if (userConfig.unsafeDomainsString) {
    return userConfig.unsafeDomainsString;
  } else {
    return l10n.get("setting_unsafeDomainsTemplate");
  }
}

function serializeUnsafeDomains() {
  let unsafeDomainsString = document.getElementById("unsafeDomainsTextArea").value ?? "";
  const policyUnsafeDomainsString = createSectionableArrayConfigComment(policyConfig.unsafeDomains);
  if (policyUnsafeDomainsString) {
    const template = l10n
      .get("setting_unsafeDomainsPolicy", {
        policy: policyUnsafeDomainsString,
        user: "",
      })
      .trim();
    unsafeDomainsString = unsafeDomainsString.replace(template, "");
  }
  unsafeDomainsString = unsafeDomainsString.trim();
  return unsafeDomainsString;
}

function createDisplayUnsafeFiles() {
  const policyUnsafeFilesString = createSectionableArrayConfigComment(policyConfig.unsafeFiles);
  if (policyUnsafeFilesString) {
    let userUnsafeFilesString = userConfig.unsafeFilesString?.trim() ?? "";
    if (!userUnsafeFilesString) {
      userUnsafeFilesString = l10n.get("setting_unsafeFilesExample");
    }
    return l10n.get("setting_unsafeFilesPolicy", {
      policy: policyUnsafeFilesString,
      user: userUnsafeFilesString,
    });
  } else if (userConfig.unsafeFilesString) {
    return userConfig.unsafeFilesString;
  } else {
    return l10n.get("setting_unsafeFilesTemplate");
  }
}

function serializeUnsafeFiles() {
  const policyUnsafeFilesString = createSectionableArrayConfigComment(
    policyConfig.unsafeFiles,
    Config.defaultUnsafeDomainsConfigSection
  );
  let unsafeFilesString = document.getElementById("unsafeFilesTextArea").value ?? "";
  if (policyUnsafeFilesString) {
    const template = l10n
      .get("setting_unsafeFilesPolicy", {
        policy: policyUnsafeFilesString,
        user: "",
      })
      .trim();
    unsafeFilesString = unsafeFilesString.replace(template, "");
  }
  unsafeFilesString = unsafeFilesString.trim();
  return unsafeFilesString;
}

function createDisplayUnsafeBodies() {
  const policyUnsafeBodiesString = createUnsafeBodiesConfigComment(policyConfig.unsafeBodies);
  if (policyUnsafeBodiesString) {
    let userUnsafeBodiesString = userConfig.unsafeBodiesString?.trim() ?? "";
    if (!userUnsafeBodiesString) {
      userUnsafeBodiesString = l10n.get("setting_unsafeBodiesExample");
    }
    return l10n.get("setting_unsafeBodiesPolicy", {
      policy: policyUnsafeBodiesString,
      user: userUnsafeBodiesString,
    });
  } else if (userConfig.unsafeBodiesString) {
    return userConfig.unsafeBodiesString;
  } else {
    return l10n.get("setting_unsafeBodiesTemplate");
  }
}

function serializeUnsafeBodies() {
  const policyUnsafeBodiesString = createUnsafeBodiesConfigComment(policyConfig.unsafeBodies);
  let unsafeBodiesString = document.getElementById("unsafeBodiesTextArea").value ?? "";
  if (policyUnsafeBodiesString) {
    const template = l10n
      .get("setting_unsafeBodiesPolicy", {
        policy: policyUnsafeBodiesString,
        user: "",
      })
      .trim();
    unsafeBodiesString = unsafeBodiesString.replace(template, "");
  }
  unsafeBodiesString = unsafeBodiesString.trim();
  return unsafeBodiesString;
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

function updateDialogSetting(policy, user) {
  policyConfig = policyConfig.merge(policy);
  userConfig = userConfig.merge(user);
  effectiveConfig = effectiveConfig.merge(policyConfig).merge(userConfig);
  console.debug(effectiveConfig);
  const common = effectiveConfig.common;
  const fixedParametersSet = new Set(policyConfig.common.FixedParameters ?? []);
  const trustedDomainsString = createDisplayTrustedDomains();
  const unsafeDomainsString = createDisplayUnsafeDomains();
  const unsafeFilesString = createDisplayUnsafeFiles();
  const unsafeBodiesString = createDisplayUnsafeBodies();

  document.getElementById("trustedDomainsTextArea").value = trustedDomainsString;
  document.getElementById("trustedDomainsTextArea").disabled =
    fixedParametersSet.has("TrustedDomains");
  document.getElementById("unsafeDomainsTextArea").value = unsafeDomainsString;
  document.getElementById("unsafeDomainsTextArea").disabled =
    fixedParametersSet.has("UnsafeDomains");
  document.getElementById("unsafeFilesTextArea").value = unsafeFilesString;
  document.getElementById("unsafeFilesTextArea").disabled = fixedParametersSet.has("UnsafeFiles");
  document.getElementById("unsafeBodiesTextArea").value = unsafeBodiesString;
  document.getElementById("unsafeBodiesTextArea").disabled = fixedParametersSet.has("UnsafeBodies");

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

function serializeCommonConfig(opt, cur) {
  const def = policyConfig.common[opt];
  if (Object.hasOwn(userConfig.common, opt) || cur != def) {
    return `${opt}=${cur}\n`;
  }
  return "";
}

function serializeCommonConfigs() {
  const countEnabled = document.getElementById("countEnabled").checked;
  const countAllowSkip = document.getElementById("countAllowSkip").checked;
  const countSeconds = document.getElementById("countSeconds").value;
  const safeBccEnabled = document.getElementById("safeBccEnabled").checked;
  const safeBccThreshold = document.getElementById("safeBccThreshold").value;
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
  let commonConfigString = "";
  commonConfigString += serializeCommonConfig("CountEnabled", countEnabled);
  commonConfigString += serializeCommonConfig("CountSeconds", countSeconds);
  commonConfigString += serializeCommonConfig("CountAllowSkip", countAllowSkip);
  commonConfigString += serializeCommonConfig("SafeBccEnabled", safeBccEnabled);
  commonConfigString += serializeCommonConfig("SafeBccThreshold", safeBccThreshold);
  commonConfigString += serializeCommonConfig(
    "SafeBccReconfirmationThreshold",
    safeBccReconfirmationThreshold
  );
  commonConfigString += serializeCommonConfig("SafeNewDomainsEnabled", safeNewDomainsEnabled);
  commonConfigString += serializeCommonConfig("RequireCheckSubject", requireCheckSubject);
  commonConfigString += serializeCommonConfig("RequireCheckBody", requireCheckBody);
  commonConfigString += serializeCommonConfig("MainSkipIfNoExt", mainSkipIfNoExt);
  commonConfigString += serializeCommonConfig("CountSkipIfNoExt", countSkipIfNoExt);
  commonConfigString += serializeCommonConfig("UntrustUnsafeRecipients", untrustUnsafeRecipients);
  commonConfigString += serializeCommonConfig(
    "AppointmentConfirmationEnabled",
    appointmentConfirmationEnabled
  );
  commonConfigString += serializeCommonConfig("DelayDeliveryEnabled", delayDeliveryEnabled);
  commonConfigString += serializeCommonConfig("DelayDeliverySeconds", delayDeliverySeconds);
  commonConfigString += serializeCommonConfig("ConvertToBccEnabled", convertToBccEnabled);
  commonConfigString += serializeCommonConfig("ConvertToBccThreshold", convertToBccThreshold);
  commonConfigString += serializeCommonConfig("BlockDistributionLists", blockDistributionLists);
  commonConfigString += serializeCommonConfig("EmphasizeUntrustedToCc", emphasizeUntrustedToCc);
  // FixedParameters is for policy setting.
  // Do not serialize FixedParameters for user setting.
  return commonConfigString;
}

window.onSave = () => {
  console.debug("onSave");
  const commonString = serializeCommonConfigs();
  const trustedDomainsString = serializeTrustedDomains();
  const unsafeDomainsString = serializeUnsafeDomains();
  const unsafeFilesString = serializeUnsafeFiles();
  const unsafeBodiesString = serializeUnsafeBodies();
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
