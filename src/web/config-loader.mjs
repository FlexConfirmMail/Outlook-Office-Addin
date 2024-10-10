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

  static assign(targetConfig, paramDefs, key, valStr) {
    if (!(key in paramDefs)) {
      return false;
    }
    const keyType = paramDefs[key];
    switch (keyType) {
      case "boolean":
        const boolResult = this.parseBool(valStr);
        if (boolResult !== null) {
          targetConfig[key] = boolResult;
          return true;
        }
        break;
      case "number":
        const numResult = parseInt(valStr, 10);
        if (!isNaN(numResult)) {
          targetConfig[key] = numResult;
          return true;
        }
        break;
    }
    return false;
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
    const resultDictionary = {};
    str = str.trim();
    for (let item of str.split("\n")) {
      item = item.trim();
      if (item.length <= 0 || item[0] === "#") {
        continue;
      }
      const regex = /^([^=]+)\s*=\s*(.*)$/;
      const match = item.match(regex);
      if (!match) {
        continue;
      }
      const key = match[1].trim();
      const value = match[2].trim();
      this.assign(resultDictionary, paramDefs, key, value);
    }
    return resultDictionary;
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
}
