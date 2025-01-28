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
    if (!str) {
      return null;
    }
    const resultList = [];
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
    if (!str) {
      return null;
    }
    const dictionary = {};
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
      const data = await response.text();
      console.debug(data);
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  static async load() {
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

  static async loadAsString() {
    const [trustedDomains, unsafeDomains, unsafeFiles, common] = await Promise.all([
      this.loadFile("configs/TrustedDomains.txt"),
      this.loadFile("configs/UnsafeDomains.txt"),
      this.loadFile("configs/UnsafeFiles.txt"),
      this.loadFile("configs/Common.txt"),
    ]);
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
      unsafeFiles
    }
  }

  /**
   * Load user config from roamingSettings.
   * Note tha this function does not work in the dialog context
   * because Office.context.roamingSettings does not work in the
   * dialog context as its specification.
   * @returns user data hash
   */
  static async loadUserConfigAsString() {
    const trustedDomains = Office.context.roamingSettings.get("trustedDomains") ?? "";
    const unsafeDomains = Office.context.roamingSettings.get("unsafeDomains") ?? "";
    const unsafeFiles = Office.context.roamingSettings.get("unsafeFiles") ?? "";
    const common = Office.context.roamingSettings.get("common") ?? "";
    return {
      common,
      trustedDomains,
      unsafeDomains,
      unsafeFiles
    }
  }

  static merge(left, right) {
    if (!left) {
      return right;
    }
    if (!right) {
      return left;
    }
    if (right.common.countEnabled != null) {
      left.common.countEnabled = right.common.countEnabled;
    }
    if (right.common.countAllowSkip != null) {
      left.common.countAllowSkip = right.common.countAllowSkip;
    }
    if (right.common.SafeBccEnabled != null) {
      left.common.safeBccEnabled = right.common.safeBccEnabled;
    }
    if (right.common.MainSkipIfNoExt != null) {
      left.common.mainSkipIfNoExt = right.common.mainSkipIfNoExt;
    }
    if (right.common.SafeNewDomainsEnabled != null) {
      left.common.safeNewDomainsEnabled = right.common.safeNewDomainsEnabled;
    }
    if (right.common.CountSeconds != null) {
      left.common.countSeconds = right.common.countSeconds;
    }
    if (right.common.SafeBccThreshold != null) {
      left.common.safeBccThreshold = right.common.safeBccThreshold;
    }
    left.trustedDomains = left.trustedDomains.concat(right.trustedDomains);
    left.unsafeDomains = left.unsafeDomains.concat(right.unsafeDomains);
    left.unsafeFiles = left.unsafeFiles.concat(right.unsafeFiles);
    return left;
  }
}
