// import { DesignToken } from '@microsoft/fast-foundation';
import { ConfigLoader } from "./config-loader.mjs";

Office.onReady((info) => {
    Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, onMessageFromParent);
    sendStatusToParent("ready");
});

async function onMessageFromParent(arg) {
    if (!arg.message) {
        return;
    }
    const config = JSON.parse(arg.message);
    if (!config) {
        return;
    }
    const common = ConfigLoader.toDictionary(config.common, ConfigLoader.commonParamDefs);
    console.debug(config);

    if (common.CountEnabled) {
        document.getElementById('countEnabled').checked = true;
    }
    if (common.CountAllowSkip) {
        document.getElementById('countAllowSkip').checked = true;
    }
    if (common.SafeBccEnabled) {
        document.getElementById('safeBccEnabled').checked = true;
    }
    if (common.MainSkipIfNoExt) {
        document.getElementById('mainSkipIfNoExt').checked = true;
    }
    if (common.SafeNewDomainsEnabled) {
        document.getElementById('safeNewDomainsEnabled').checked = true;
    }
    if (common.CountSeconds) {
        document.getElementById('countSeconds').value = common.CountSeconds;
    }
    if (common.SafeBccThreshold) {
        document.getElementById('safeBccThreshold').value = common.SafeBccThreshold;
    }
    document.getElementById('trustedDomainsTextArea').value = config.trustedDomains ?? "";
    document.getElementById('unsafeDomainsTextArea').value = config.unsafeDomains ?? "";
    document.getElementById('unsafeFilesTextArea').value = config.unsafeFiles ?? "";
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

function parseCommonConfig() {
    const countEnabled = document.getElementById('countEnabled').checked;
    const countAllowSkip = document.getElementById('countAllowSkip').checked;
    const countSeconds = document.getElementById('countSeconds').value;
    const safeBccEnabled = document.getElementById('safeBccEnabled').checked;
    const safeBccThreshold = document.getElementById('safeBccThreshold').value;
    const safeNewDomainsEnabled = document.getElementById('safeNewDomainsEnabled').checked;
    const mainSkipIfNoExt = document.getElementById('mainSkipIfNoExt').checked;
    let commonConfig = [];
    if (countEnabled) {
        commonConfig.push("CountEnabled=True");
        commonConfig.push("CountSeconds=" + (countSeconds ?? "0"));
    }
    if (countAllowSkip) {
        commonConfig.push("CountAllowSkip=True");
    }
    if (safeBccEnabled) {
        commonConfig.push("SafeBccEnabled=True");;
        commonConfig.push("SafeBccThreshold=" + (safeBccThreshold ?? "0"));
    }
    if (safeNewDomainsEnabled) {
        commonConfig.push("SafeNewDomainsEnabled=True");
    }
    if (mainSkipIfNoExt) {
        commonConfig.push("MainSkipIfNoExt=True");
    }
    let commonConfigString = commonConfig.join('\n');
    return commonConfigString;
}

window.onSave = () => {
    const common = parseCommonConfig();
    const trustedDomains = document.getElementById('trustedDomainsTextArea').value ?? "";
    const unsafeDomains = document.getElementById('unsafeDomainsTextArea').value ?? "";
    const unsafeFiles = document.getElementById('unsafeFilesTextArea').value ?? "";
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
    sendStatusToParent("cancel");
};