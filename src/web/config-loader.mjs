export class ConfigLoader {
  static commonParamDefs = {
    CountEnabled: "boolean",
    CountAllowSkip: "boolean",
    SafeBccEnabled: "boolean",
    MainSkipIfNoExt: "boolean",
    SafeNewDomainsEnabled: "boolean",
    CountSeconds: "number",
    SafeBccThreshold: "number",
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
    }
    return null;
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
      if (!response.ok)
      {
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
    if (right.common.CountEnabled != null) {
      left.common.CountEnabled = right.common.CountEnabled;
    }
    if (right.common.CountAllowSkip != null) {
      left.common.CountAllowSkip = right.common.CountAllowSkip;
    }
    if (right.common.SafeBccEnabled != null) {
      left.common.SafeBccEnabled = right.common.SafeBccEnabled;
    }
    if (right.common.MainSkipIfNoExt != null) {
      left.common.MainSkipIfNoExt = right.common.MainSkipIfNoExt;
    }
    if (right.common.SafeNewDomainsEnabled != null) {
      left.common.SafeNewDomainsEnabled = right.common.SafeNewDomainsEnabled;
    }
    if (right.common.CountSeconds != null) {
      left.common.CountSeconds = right.common.CountSeconds;
    }
    if (right.common.SafeBccThreshold != null) {
      left.common.SafeBccThreshold = right.common.SafeBccThreshold;
    }
    left.trustedDomains = left.trustedDomains.concat(right.trustedDomains);
    left.unsafeDomains = left.unsafeDomains.concat(right.unsafeDomains);
    left.unsafeFiles = left.unsafeFiles.concat(right.unsafeFiles);
    return left;
  }
}
