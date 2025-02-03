// import { DesignToken } from '@microsoft/fast-foundation';
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

function createTrustedDomainsString(policy, user) {
  if (policy.trustedDomains && policy.trustedDomains.length > 0) {
    const policyDomainsString = policy.trustedDomains?.join("\n# ") ?? "";
    const userDomainsString = user.trustedDomains?.join("\n") ?? l10n.get("setting_trustedDomainsExample");
    return l10n.get("setting_trustedDomainsPolicy", {
      policy: policyDomainsString,
      user: userDomainsString,
    });
  } else if (user.trustedDomains && user.trustedDomains.length > 0) {
    return user.trustedDomains.join("\n");
  } else {
    return l10n.get("setting_trustedDomainsTemplate");
  }
}

function createUnsafeDomainsString(policy, user) {
  if (policy.unsafeDomains && policy.unsafeDomains.length > 0) {
    const policyUnsafeDomainsString = policy.unsafeDomains?.join("\n# ") ?? "";
    const userUnsafeDomainsString = user.unsafeDomains?.join("\n") ?? l10n.get("setting_unsafeDomainsExample");
    return l10n.get("setting_unsafeDomainsPolicy", {
      policy: policyUnsafeDomainsString,
      user: userUnsafeDomainsString,
    });
  } else if (user.unsafeDomains && user.unsafeDomains.length > 0) {
    return user.unsafeDomains.join("\n");
  } else {
    return l10n.get("setting_unsafeDomainsTemplate");
  }
}

function createUnsafeFilesString(policy, user) {
  if (policy.unsafeFiles && policy.unsafeFiles.length > 0) {
    const policyUnsafeFilesString = policy.unsafeFiles?.join("\n# ") ?? "";
    const userUnsafeFilesString = user.unsafeFiles?.join("\n") ?? l10n.get("setting_unsafeFilesExample");
    return l10n.get("setting_unsafeFilesPolicy", {
      policy: policyUnsafeFilesString,
      user: userUnsafeFilesString,
    });
  } else if (user.unsafeFiles && user.unsafeFiles.length > 0) {
    return user.unsafeFiles.join("\n");
  } else {
    return l10n.get("setting_unsafeFilesTemplate");
  }
}

async function onMessageFromParent(arg) {
  if (!arg.message) {
    return;
  }
  const configs = JSON.parse(arg.message);
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
  const fixedParameters = policyConfig.common.FixedParameters ?? [];
  const trustedDomainsString = createTrustedDomainsString(policyConfig, userConfig);
  const unsafeDomainsString = createUnsafeDomainsString(policyConfig, userConfig);
  const unsafeFilesString = createUnsafeFilesString(policyConfig, userConfig);

  document.getElementById("trustedDomainsTextArea").value = trustedDomainsString;
  document.getElementById("trustedDomainsTextArea").disabled = fixedParameters.includes("TrustedDomains");
  document.getElementById("unsafeDomainsTextArea").value = unsafeDomainsString;
  document.getElementById("unsafeDomainsTextArea").disabled = fixedParameters.includes("UnsafeDomains");
  document.getElementById("unsafeFilesTextArea").value = unsafeFilesString;
  document.getElementById("unsafeFilesTextArea").disabled = fixedParameters.includes("UnsafeFiles");

  document.getElementById("countEnabled").checked = common.CountEnabled;
  document.getElementById("countEnabled").disabled = fixedParameters.includes("CountEnabled");
  document.getElementById("countAllowSkip").checked = common.CountAllowSkip;
  document.getElementById("countAllowSkip").disabled =
    fixedParameters.includes("CountEnabled") || fixedParameters.includes("CountAllowSkip");
  document.getElementById("safeBccEnabled").checked = common.SafeBccEnabled;
  document.getElementById("safeBccEnabled").disabled = fixedParameters.includes("SafeBccEnabled");
  document.getElementById("mainSkipIfNoExt").checked = common.MainSkipIfNoExt;
  document.getElementById("mainSkipIfNoExt").disabled = fixedParameters.includes("MainSkipIfNoExt");
  document.getElementById("safeNewDomainsEnabled").checked = common.SafeNewDomainsEnabled;
  document.getElementById("safeNewDomainsEnabled").disabled = fixedParameters.includes("SafeNewDomainsEnabled");
  document.getElementById("countSeconds").value = common.CountSeconds;
  document.getElementById("countSeconds").disabled =
    fixedParameters.includes("CountEnabled") || fixedParameters.includes("CountSeconds");
  document.getElementById("safeBccThreshold").value = common.SafeBccThreshold;
  document.getElementById("safeBccThreshold").disabled =
    fixedParameters.includes("SafeBccEnabled") || fixedParameters.includes("SafeBccThreshold");
  document.getElementById("delayDeliveryEnabled").checked = common.DelayDeliveryEnabled;
  document.getElementById("delayDeliveryEnabled").disabled = fixedParameters.includes("DelayDeliveryEnabled");
  document.getElementById("delayDeliverySeconds").value = common.DelayDeliverySeconds;
  document.getElementById("delayDeliverySeconds").disabled =
    fixedParameters.includes("DelayDeliveryEnabled") || fixedParameters.includes("DelayDeliverySeconds");
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
  commonConfigString += serializeCommonConfig("DelayDeliveryEnabled", delayDeliveryEnabled);
  commonConfigString += serializeCommonConfig("DelayDeliverySeconds", delayDeliverySeconds);
  // FixedParameters is for policy setting.
  // Do not serialize FixedParameters for user setting.
  return commonConfigString;
}

window.onSave = () => {
  console.debug("onSave");
  const common = serializeCommonConfigs();
  const trustedDomains = document.getElementById("trustedDomainsTextArea").value ?? "";
  const unsafeDomains = document.getElementById("unsafeDomainsTextArea").value ?? "";
  const unsafeFiles = document.getElementById("unsafeFilesTextArea").value ?? "";
  console.debug("common: " + common);
  console.debug("trustedDomains: " + trustedDomains);
  console.debug("unsafeDomains: " + unsafeDomains);
  console.debug("unsafeFiles: " + unsafeFiles);
  const config = {
    common,
    trustedDomains,
    unsafeDomains,
    unsafeFiles,
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
