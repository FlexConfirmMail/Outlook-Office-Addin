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
    for (const [paramName, typeName] of Object.entries(Config.commonParamDefs)) {
      if (other.common[paramName] == null) {
        continue;
      }
      if (fixedParametersSet.has(paramName)) {
        continue;
      }
      switch (typeName) {
        case "boolean":
        case "number":
        case "text":
          this.common[paramName] = other.common[paramName];
          break;
        case "commaSeparatedValues": {
          const thisParamValue = this.common[paramName] ?? [];
          const otherParamValue = other.common[paramName] ?? [];
          const newParamValueSet = new Set([...thisParamValue, ...otherParamValue]);
          this.common[paramName] = [...newParamValueSet];
          break;
        }
        default:
          break;
      }
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
    UntrustUnsafeRecipients: "boolean",
    AppointmentConfirmationEnabled: "boolean",
    SafeNewDomainsEnabled: "boolean",
    CountSeconds: "number",
    SafeBccThreshold: "number",
    SafeBccReconfirmationThreshold: "number",
    DelayDeliveryEnabled: "boolean",
    DelayDeliverySeconds: "number",
    ConvertToBccEnabled: "boolean",
    ConvertToBccThreshold: "number",
    FixedParameters: "commaSeparatedValues",
  };
  static unsafeBodiesParamDefs = {
    Keywords: "commaSeparatedValues",
    WarningType: "text",
    Message: "text",
    Language: "text",
  };
  static unsafeWarningTypeDefs = ["WARNING", "BLOCK", "REWARNING"];
  static unsafeArraySectionDefs = Config.unsafeWarningTypeDefs;
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
        UntrustUnsafeRecipients: false,
        AppointmentConfirmationEnabled: false,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        SafeBccReconfirmationThreshold: 0,
        DelayDeliveryEnabled: false,
        DelayDeliverySeconds: 60,
        ConvertToBccEnabled: false,
        ConvertToBccThreshold: 2,
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
