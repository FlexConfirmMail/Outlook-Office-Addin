export class ConfigLoader {
  static commonParamDefs = {
    CountEnabled: "boolean",
    CountAllowSkip: "boolean",
    SafeBccEnabled: "boolean",
    MainSkipIfNoExt: "boolean",
    SafeNewDomainsEnabled: "boolean",
    CountSeconds: "number",
    SafeBccThreshold: "number",
    DelayDeliveryEnabled: "boolean",
    DelayDeliverySeconds: "number",
    FixedParameters: "commaSeparatedValues",
  };

  static DICTONARY_LINE_SPLITTER = /^([^=]+)=(.*)$/;

  static parseValue(paramDefs, key, valueStr) {
    if (!(key in paramDefs)) {
      return null;
    }
    const keyType = paramDefs[key];
    switch (keyType) {
      case "boolean": {
        const boolResult = this.parseBool(valueStr);
        if (boolResult !== null) {
          return boolResult;
        }
        break;
      }
      case "number": {
        const numResult = parseInt(valueStr, 10);
        if (!isNaN(numResult)) {
          return numResult;
        }
        break;
      }
      case "commaSeparatedValues": {
        const csvArrayResult = this.parseCommaSeparatedValues(valueStr);
        if (csvArrayResult !== null) {
          return csvArrayResult;
        }
        break;
      }
    }
    return null;
  }

  /**
   * Parse CSV string to array.
   * This method is not fully support CSV specification.
   * @param {*} str
   * @returns
   */
  static parseCommaSeparatedValues(str) {
    if (!str) {
      return null;
    }
    const resultList = [];
    for (let item of str.split(",")) {
      item = item.trim();
      if (item.length <= 0) {
        continue;
      }
      resultList.push(item);
    }
    return resultList;
  }

  static parseBool(str) {
    if (!str) {
      return null;
    }
    if (/^(yes|true|on|1)$/i.test(str)) {
      return true;
    }
    if (/^(no|false|off|0)$/i.test(str)) {
      return false;
    }
    return null;
  }

  static toArray(str) {
    const resultList = [];
    if (!str) {
      return resultList;
    }
    str = str.trim();
    for (let item of str.split("\n")) {
      item = item.trim();
      if (item.length <= 0 || item[0] === "#") {
        continue;
      }
      resultList.push(item);
    }
    return resultList;
  }

  static toDictionary(str, paramDefs) {
    const dictionary = {};
    if (!str) {
      return dictionary;
    }
    str = str.trim();
    for (let item of str.split("\n")) {
      item = item.trim();
      if (item.length <= 0 || item[0] === "#") {
        continue;
      }
      const match = item.match(this.DICTONARY_LINE_SPLITTER);
      if (!match) {
        continue;
      }
      const key = match[1].trim();
      const valueStr = match[2].trim();
      const value = this.parseValue(paramDefs, key, valueStr);
      if (value === null) {
        continue;
      }
      dictionary[key] = value;
    }
    return dictionary;
  }

  static async loadFile(url) {
    console.debug("loadFile ", url);
    try {
      const response = await fetch(url);
      console.debug("response:", response);
      if (!response.ok) {
        return null;
      }
      const data = await response.text();
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  static async loadEffectiveConfig() {
    const [fileConfig, userConfig] = await Promise.all([this.loadFileConfig(), this.loadUserConfig()]);
    const effectiveConfig = await this.merge(fileConfig, userConfig);
    return effectiveConfig;
  }

  static async loadFileConfig() {
    const [trustedDomainsString, unsafeDomainsString, unsafeFilesString, commonString] = await Promise.all([
      this.loadFile("configs/TrustedDomains.txt"),
      this.loadFile("configs/UnsafeDomains.txt"),
      this.loadFile("configs/UnsafeFiles.txt"),
      this.loadFile("configs/Common.txt"),
    ]);
    const trustedDomains = this.toArray(trustedDomainsString);
    const unsafeDomains = this.toArray(unsafeDomainsString);
    const unsafeFiles = this.toArray(unsafeFilesString);
    const common = this.toDictionary(commonString, this.commonParamDefs);
    return {
      trustedDomains,
      unsafeDomains,
      unsafeFiles,
      common,
    };
  }

  /**
   * Load user config from roamingSettings.
   * Note tha this function does not work in the dialog context
   * because Office.context.roamingSettings does not work in the
   * dialog context as its specification.
   * @returns user data hash
   */
  static async loadUserConfig() {
    const trustedDomainsString = Office.context.roamingSettings.get("trustedDomains") ?? "";
    const unsafeDomainsString = Office.context.roamingSettings.get("unsafeDomains") ?? "";
    const unsafeFilesString = Office.context.roamingSettings.get("unsafeFiles") ?? "";
    const commonString = Office.context.roamingSettings.get("common") ?? "";
    const trustedDomains = this.toArray(trustedDomainsString);
    const unsafeDomains = this.toArray(unsafeDomainsString);
    const unsafeFiles = this.toArray(unsafeFilesString);
    const common = this.toDictionary(commonString, this.commonParamDefs);
    return {
      common,
      trustedDomains,
      unsafeDomains,
      unsafeFiles,
    };
  }

  static createDefaultConfig() {
    return {
      common: {
        CountEnabled: true,
        CountAllowSkip: true,
        SafeBccEnabled: true,
        MainSkipIfNoExt: false,
        SafeNewDomainsEnabled: true,
        CountSeconds: 3,
        SafeBccThreshold: 4,
        DelayDeliveryEnabled: false,
        DelayDeliverySeconds: 60,
        FixedParameters: [],
      },
      trustedDomains: [],
      unsafeDomains: [],
      unsafeFiles: [],
    };
  }

  static createEmptyConfig() {
    return {
      common: {},
      trustedDomains: [],
      unsafeDomains: [],
      unsafeFiles: [],
    };
  }

  static merge(left, right) {
    const fixedParametersSet = new Set(left.common.FixedParameters ?? []);
    if (right.common.CountEnabled != null && !fixedParametersSet.has("CountEnabled")) {
      left.common.CountEnabled = right.common.CountEnabled;
    }
    if (right.common.CountAllowSkip != null && !fixedParametersSet.has("CountAllowSkip")) {
      left.common.CountAllowSkip = right.common.CountAllowSkip;
    }
    if (right.common.SafeBccEnabled != null && !fixedParametersSet.has("SafeBccEnabled")) {
      left.common.SafeBccEnabled = right.common.SafeBccEnabled;
    }
    if (right.common.MainSkipIfNoExt != null && !fixedParametersSet.has("MainSkipIfNoExt")) {
      left.common.MainSkipIfNoExt = right.common.MainSkipIfNoExt;
    }
    if (right.common.SafeNewDomainsEnabled != null && !fixedParametersSet.has("SafeNewDomainsEnabled")) {
      left.common.SafeNewDomainsEnabled = right.common.SafeNewDomainsEnabled;
    }
    if (right.common.CountSeconds != null && !fixedParametersSet.has("CountSeconds")) {
      left.common.CountSeconds = right.common.CountSeconds;
    }
    if (right.common.SafeBccThreshold != null && !fixedParametersSet.has("SafeBccThreshold")) {
      left.common.SafeBccThreshold = right.common.SafeBccThreshold;
    }
    if (right.common.DelayDeliveryEnabled != null && !fixedParametersSet.has("DelayDeliveryEnabled")) {
      left.common.DelayDeliveryEnabled = right.common.DelayDeliveryEnabled;
    }
    if (right.common.DelayDeliverySeconds != null && !fixedParametersSet.has("DelayDeliverySeconds")) {
      left.common.DelayDeliverySeconds = right.common.DelayDeliverySeconds;
    }
    if (!fixedParametersSet.has("TrustedDomains")) {
      left.trustedDomains = left.trustedDomains.concat(right.trustedDomains);
    }
    if (!fixedParametersSet.has("UnsafeDomains")) {
      left.unsafeDomains = left.unsafeDomains.concat(right.unsafeDomains);
    }
    if (!fixedParametersSet.has("UnsafeFiles")) {
      left.unsafeFiles = left.unsafeFiles.concat(right.unsafeFiles);
    }
    const rightFixedParametersSet = new Set(right.common.FixedParameters ?? []);
    const newFixedParametersSet = new Set([...fixedParametersSet, ...rightFixedParametersSet]);
    left.common.FixedParameters = [...newFixedParametersSet];
    return left;
  }
}
