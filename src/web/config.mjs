/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/
export class Config {
  common = {};
  trustedDomains = [];
  unsafeDomains = {};
  unsafeFiles = {};
  unsafeBodies = {};
  commonString = "";
  trustedDomainsString = "";
  unsafeDomainsString = "";
  unsafeFilesString = "";
  unsafeBodiesString = "";

  constructor({
    common,
    trustedDomains,
    unsafeDomains,
    unsafeFiles,
    unsafeBodies,
    commonString,
    trustedDomainsString,
    unsafeDomainsString,
    unsafeFilesString,
    unsafeBodiesString,
  }) {
    this.common = common;
    this.trustedDomains = trustedDomains;
    this.unsafeDomains = unsafeDomains;
    this.unsafeFiles = unsafeFiles;
    this.unsafeBodies = unsafeBodies;
    this.commonString = commonString;
    this.trustedDomainsString = trustedDomainsString;
    this.unsafeDomainsString = unsafeDomainsString;
    this.unsafeFilesString = unsafeFilesString;
    this.unsafeBodiesString = unsafeBodiesString;
  }

  merge(other) {
    const fixedParametersSet = new Set(this.common.FixedParameters ?? []);
    if (other.common.CountEnabled != null && !fixedParametersSet.has("CountEnabled")) {
      this.common.CountEnabled = other.common.CountEnabled;
    }
    if (other.common.CountAllowSkip != null && !fixedParametersSet.has("CountAllowSkip")) {
      this.common.CountAllowSkip = other.common.CountAllowSkip;
    }
    if (other.common.SafeBccEnabled != null && !fixedParametersSet.has("SafeBccEnabled")) {
      this.common.SafeBccEnabled = other.common.SafeBccEnabled;
    }
    if (
      other.common.RequireCheckSubject != null &&
      !fixedParametersSet.has("RequireCheckSubject")
    ) {
      this.common.RequireCheckSubject = other.common.RequireCheckSubject;
    }
    if (other.common.RequireCheckBody != null && !fixedParametersSet.has("RequireCheckBody")) {
      this.common.RequireCheckBody = other.common.RequireCheckBody;
    }
    if (other.common.MainSkipIfNoExt != null && !fixedParametersSet.has("MainSkipIfNoExt")) {
      this.common.MainSkipIfNoExt = other.common.MainSkipIfNoExt;
    }
    if (
      other.common.AppointmentConfirmationEnabled != null &&
      !fixedParametersSet.has("AppointmentConfirmationEnabled")
    ) {
      this.common.AppointmentConfirmationEnabled = other.common.AppointmentConfirmationEnabled;
    }
    if (
      other.common.SafeNewDomainsEnabled != null &&
      !fixedParametersSet.has("SafeNewDomainsEnabled")
    ) {
      this.common.SafeNewDomainsEnabled = other.common.SafeNewDomainsEnabled;
    }
    if (other.common.CountSeconds != null && !fixedParametersSet.has("CountSeconds")) {
      this.common.CountSeconds = other.common.CountSeconds;
    }
    if (other.common.SafeBccThreshold != null && !fixedParametersSet.has("SafeBccThreshold")) {
      this.common.SafeBccThreshold = other.common.SafeBccThreshold;
    }
    if (
      other.common.SafeBccReconfirmationThreshold != null &&
      !fixedParametersSet.has("SafeBccReconfirmationThreshold")
    ) {
      this.common.SafeBccReconfirmationThreshold = other.common.SafeBccReconfirmationThreshold;
    }
    if (
      other.common.DelayDeliveryEnabled != null &&
      !fixedParametersSet.has("DelayDeliveryEnabled")
    ) {
      this.common.DelayDeliveryEnabled = other.common.DelayDeliveryEnabled;
    }
    if (
      other.common.DelayDeliverySeconds != null &&
      !fixedParametersSet.has("DelayDeliverySeconds")
    ) {
      this.common.DelayDeliverySeconds = other.common.DelayDeliverySeconds;
    }
    if (!fixedParametersSet.has("TrustedDomains")) {
      this.trustedDomains = this.trustedDomains.concat(other.trustedDomains);
      this.trustedDomainsString += "\n" + other.trustedDomainsString;
      this.trustedDomainsString = this.trustedDomainsString.trim();
    }
    if (!fixedParametersSet.has("UnsafeDomains")) {
      this.unsafeDomains = Config.mergeSectionableArrayConfig(
        Config.unsafeArraySectionDefs,
        this.unsafeDomains,
        other.unsafeDomains
      );
      if (this.unsafeDomainsString && other.unsafeDomainsString) {
        // We must add [WARNING] just before right string.
        // We can ommit [WARNING] section declaration, so when right ommits [WARNING] section declaration,
        // the right [WARNING] section may be in the wrong section after merged.
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
        this.unsafeDomainsString +=
          `\n[${Config.defaultUnsafeDomainsConfigSection}]\n` + other.unsafeDomainsString;
      } else {
        this.unsafeDomainsString += "\n" + other.unsafeDomainsString;
      }
      this.unsafeDomainsString = this.unsafeDomainsString.trim();
    }
    if (!fixedParametersSet.has("UnsafeFiles")) {
      this.unsafeFiles = Config.mergeSectionableArrayConfig(
        Config.unsafeArraySectionDefs,
        this.unsafeFiles,
        other.unsafeFiles
      );
      if (this.unsafeFilesString && other.unsafeFilesString) {
        this.unsafeFilesString +=
          `\n[${Config.defaultUnsafeFilesConfigSection}]\n` + other.unsafeFilesString;
      } else {
        this.unsafeFilesString += "\n" + other.unsafeFilesString;
      }
      this.unsafeFilesString = this.unsafeFilesString.trim();
    }
    if (!fixedParametersSet.has("UnsafeBodies")) {
      const leftUnsafeBodies = this.unsafeBodies || {};
      const rightUnsafeBodies = other.unsafeBodies || {};
      // If there is the same section name in the left and the right, the section of right is used.
      const mergedUnsafeBodies = Object.assign({}, leftUnsafeBodies, rightUnsafeBodies);
      this.unsafeBodies = mergedUnsafeBodies;
      // If there is the same section name in the left and the right, both of them are written
      // in the unsafeBodiesString. As the config file specification, the later section overrides
      // the previous, as the result, the section of right is used.
      this.unsafeBodiesString += "\n" + other.unsafeBodiesString;
      this.unsafeBodiesString = this.unsafeBodiesString.trim();
    }
    const rightFixedParametersSet = new Set(other.common.FixedParameters ?? []);
    const newFixedParametersSet = new Set([...fixedParametersSet, ...rightFixedParametersSet]);
    this.common.FixedParameters = [...newFixedParametersSet];
    let commonString = "";
    for (const [key, value] of Object.entries(this.common)) {
      if (key === "FixedParameters") {
        if (value.length > 0) {
          commonString += `${key} = ${value.join(",")}\n`;
        }
      } else {
        commonString += `${key} = ${value}\n`;
      }
    }
    this.commonString = commonString.trim();
    return this;
  }

  static commonParamDefs = {
    CountEnabled: "boolean",
    CountAllowSkip: "boolean",
    SafeBccEnabled: "boolean",
    RequireCheckSubject: "boolean",
    RequireCheckBody: "boolean",
    MainSkipIfNoExt: "boolean",
    AppointmentConfirmationEnabled: "boolean",
    SafeNewDomainsEnabled: "boolean",
    CountSeconds: "number",
    SafeBccThreshold: "number",
    SafeBccReconfirmationThreshold: "number",
    DelayDeliveryEnabled: "boolean",
    DelayDeliverySeconds: "number",
    FixedParameters: "commaSeparatedValues",
  };
  static unsafeBodiesParamDefs = {
    Message: "text",
    Keywords: "commaSeparatedValues",
  };
  static unsafeArraySectionDefs = ["WARNING", "BLOCK", "REWARNING"];
  static defaultUnsafeDomainsConfigSection = "WARNING";
  static defaultUnsafeFilesConfigSection = "WARNING";

  static createDefaultConfig() {
    return new Config({
      common: {
        CountEnabled: true,
        CountAllowSkip: true,
        SafeBccEnabled: true,
        RequireCheckSubject: false,
        RequireCheckBody: false,
        MainSkipIfNoExt: false,
        AppointmentConfirmationEnabled: false,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: false,
        DelayDeliverySeconds: 60,
        FixedParameters: [],
      },
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles: {},
      unsafeBodies: {},
      commonString: "",
      trustedDomainsString: "",
      unsafeDomainsString: "",
      unsafeFilesString: "",
      unsafeBodiesString: "",
    });
  }

  static createEmptyConfig() {
    return new Config({
      common: {},
      trustedDomains: [],
      unsafeDomains: {},
      unsafeFiles: {},
      unsafeBodies: {},
      commonString: "",
      trustedDomainsString: "",
      unsafeDomainsString: "",
      unsafeFilesString: "",
      unsafeBodiesString: "",
    });
  }

  static mergeSectionableArrayConfig(params, left, right) {
    const result = {};
    for (const param of params) {
      const leftValue = left[param] || [];
      const rightValue = right[param] || [];
      const resultValue = leftValue.concat(rightValue);
      if (resultValue.length == 0) {
        continue;
      }
      result[param] = leftValue.concat(rightValue);
    }
    return result;
  }

  static serializeSectionableArray(config, sectionDefs) {
    if (!config) {
      return "";
    }
    let lines = [];
    for (const sectionName of sectionDefs) {
      if (config[sectionName] && config[sectionName].length > 0) {
        lines.push(`[${sectionName}]`);
        lines = lines.concat(config[sectionName]);
      }
    }
    return lines.join("\n# ");
  }
}
