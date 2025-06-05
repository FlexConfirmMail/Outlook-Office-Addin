/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
import { ConfigLoader } from "./config-loader.mjs";
import { L10n } from "./l10n.mjs";

let l10n;
let policyConfig;
let userConfig;
let effectiveConfig;

Office.onReady(() => {
  Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, onMessageFromParent);
  const language = Office.context.displayLanguage;
  l10n = L10n.get(language);
  l10n.ready.then(() => l10n.translateAll());
  document.documentElement.setAttribute("lang", language);
  policyConfig = ConfigLoader.createDefaultConfig();
  userConfig = ConfigLoader.createEmptyConfig();
  effectiveConfig = ConfigLoader.createEmptyConfig();
  sendStatusToParent("ready");
});

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
  if (policyConfig.unsafeDomains && policyConfig.unsafeDomains.length > 0) {
    const policyUnsafeDomainsString = policyConfig.unsafeDomains?.join("\n# ") ?? "";
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
  if (policyConfig.unsafeDomains && policyConfig.unsafeDomains.length > 0) {
    const policyDomainsString = policyConfig.unsafeDomains?.join("\n# ") ?? "";
    const template = l10n
      .get("setting_unsafeDomainsPolicy", {
        policy: policyDomainsString,
        user: "",
      })
      .trim();
    unsafeDomainsString = unsafeDomainsString.replace(template, "");
  }
  unsafeDomainsString = unsafeDomainsString.trim();
  return unsafeDomainsString;
}

function createDisplayUnsafeFiles() {
  if (policyConfig.unsafeFiles && policyConfig.unsafeFiles.length > 0) {
    const policyUnsafeFilesString = policyConfig.unsafeFiles?.join("\n# ") ?? "";
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
  let unsafeFilesString = document.getElementById("unsafeFilesTextArea").value ?? "";
  if (policyConfig.unsafeFiles && policyConfig.unsafeFiles.length > 0) {
    const policyUnsafeFilesString = policyConfig.unsafeFiles?.join("\n# ") ?? "";
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
  policyConfig = ConfigLoader.merge(policyConfig, policy);
  userConfig = ConfigLoader.merge(userConfig, user);
  effectiveConfig = ConfigLoader.merge(effectiveConfig, policyConfig);
  effectiveConfig = ConfigLoader.merge(effectiveConfig, userConfig);
  console.debug(effectiveConfig);
  const common = effectiveConfig.common;
  const fixedParametersSet = new Set(policyConfig.common.FixedParameters ?? []);
  const trustedDomainsString = createDisplayTrustedDomains();
  const unsafeDomainsString = createDisplayUnsafeDomains();
  const unsafeFilesString = createDisplayUnsafeFiles();

  document.getElementById("trustedDomainsTextArea").value = trustedDomainsString;
  document.getElementById("trustedDomainsTextArea").disabled = fixedParametersSet.has("TrustedDomains");
  document.getElementById("unsafeDomainsTextArea").value = unsafeDomainsString;
  document.getElementById("unsafeDomainsTextArea").disabled = fixedParametersSet.has("UnsafeDomains");
  document.getElementById("unsafeFilesTextArea").value = unsafeFilesString;
  document.getElementById("unsafeFilesTextArea").disabled = fixedParametersSet.has("UnsafeFiles");

  document.getElementById("countEnabled").checked = common.CountEnabled;
  document.getElementById("countEnabled").disabled = fixedParametersSet.has("CountEnabled");
  document.getElementById("countAllowSkip").checked = common.CountAllowSkip;
  document.getElementById("countAllowSkip").disabled = fixedParametersSet.has("CountAllowSkip");
  document.getElementById("safeBccEnabled").checked = common.SafeBccEnabled;
  document.getElementById("safeBccEnabled").disabled = fixedParametersSet.has("SafeBccEnabled");
  document.getElementById("mainSkipIfNoExt").checked = common.MainSkipIfNoExt;
  document.getElementById("mainSkipIfNoExt").disabled = fixedParametersSet.has("MainSkipIfNoExt");
  document.getElementById("EnableAppointmentConfirmation").checked = common.EnableAppointmentConfirmation;
  document.getElementById("EnableAppointmentConfirmation").disabled = fixedParametersSet.has(
    "EnableAppointmentConfirmation"
  );
  document.getElementById("safeNewDomainsEnabled").checked = common.SafeNewDomainsEnabled;
  document.getElementById("safeNewDomainsEnabled").disabled = fixedParametersSet.has("SafeNewDomainsEnabled");
  document.getElementById("countSeconds").value = common.CountSeconds;
  document.getElementById("countSeconds").disabled = fixedParametersSet.has("CountSeconds");
  document.getElementById("safeBccThreshold").value = common.SafeBccThreshold;
  document.getElementById("safeBccThreshold").disabled = fixedParametersSet.has("SafeBccThreshold");
  document.getElementById("delayDeliveryEnabled").checked = common.DelayDeliveryEnabled;
  document.getElementById("delayDeliveryEnabled").disabled = fixedParametersSet.has("DelayDeliveryEnabled");
  document.getElementById("delayDeliverySeconds").value = common.DelayDeliverySeconds;
  document.getElementById("delayDeliverySeconds").disabled = fixedParametersSet.has("DelayDeliverySeconds");
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
  const safeNewDomainsEnabled = document.getElementById("safeNewDomainsEnabled").checked;
  const mainSkipIfNoExt = document.getElementById("mainSkipIfNoExt").checked;
  const EnableAppointmentConfirmation = document.getElementById("EnableAppointmentConfirmation").checked;
  const delayDeliveryEnabled = document.getElementById("delayDeliveryEnabled").checked;
  const delayDeliverySeconds = document.getElementById("delayDeliverySeconds").value;
  let commonConfigString = "";
  commonConfigString += serializeCommonConfig("CountEnabled", countEnabled);
  commonConfigString += serializeCommonConfig("CountSeconds", countSeconds);
  commonConfigString += serializeCommonConfig("CountAllowSkip", countAllowSkip);
  commonConfigString += serializeCommonConfig("SafeBccEnabled", safeBccEnabled);
  commonConfigString += serializeCommonConfig("SafeBccThreshold", safeBccThreshold);
  commonConfigString += serializeCommonConfig("SafeNewDomainsEnabled", safeNewDomainsEnabled);
  commonConfigString += serializeCommonConfig("MainSkipIfNoExt", mainSkipIfNoExt);
  commonConfigString += serializeCommonConfig("EnableAppointmentConfirmation", EnableAppointmentConfirmation);
  commonConfigString += serializeCommonConfig("DelayDeliveryEnabled", delayDeliveryEnabled);
  commonConfigString += serializeCommonConfig("DelayDeliverySeconds", delayDeliverySeconds);
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
  console.debug("commonString: ", commonString);
  console.debug("trustedDomainsString: ", trustedDomainsString);
  console.debug("unsafeDomainsString: ", unsafeDomainsString);
  console.debug("unsafeFilesString: ", unsafeFilesString);
  const config = {
    commonString,
    trustedDomainsString,
    unsafeDomainsString,
    unsafeFilesString,
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

  policyConfig = ConfigLoader.createDefaultConfig();
  userConfig = ConfigLoader.createEmptyConfig();
  effectiveConfig = ConfigLoader.createEmptyConfig();
  updateDialogSetting(currentPolocyConfig, userConfig);
};
