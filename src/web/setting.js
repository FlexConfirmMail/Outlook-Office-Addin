import { DesignToken } from '@microsoft/fast-foundation';

const specialColor = DesignToken.create('special-color');

Office.onReady((info) => { 
    sendStatusToParent("ready");
    console.log(specialColor);
});

function sendStatusToParent(status) {
    const messageObject = { status: status };
    const jsonMessage = JSON.stringify(messageObject);
    Office.context.ui.messageParent(jsonMessage);
  }

window.onSave = () => {
    Office.context.roamingSettings.set("TrustedDomains", "saved@example.com");
    Office.context.roamingSettings.saveAsync();
    console.log("saved");
    console.log(Office.context.roamingSettings.get("TrustedDomains"));
};
  
window.onCancel = () => {
    sendStatusToParent("cancel");
};