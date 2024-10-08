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
    if (keyType === "boolean") {
      const perseResult = this.parseBool(valStr);
      if (perseResult != null) {
        targetConfig[key] = perseResult;
        return true;
      }
    } else if (keyType === "number") {
      const perseResult = parseInt(valStr, 10);
      if (!isNaN(perseResult)) {
        targetConfig[key] = perseResult;
        return true;
      }
    }
    return false;
  }

  static parseBool(str) {
    if (!str) {
      return null;
    }
    const lowerStr = str.toLowerCase();
    if (lowerStr === "yes" || lowerStr === "true" || lowerStr === "on" || lowerStr === "1") {
      return true;
    }
    if (lowerStr === "no" || lowerStr === "false" || lowerStr === "off" || lowerStr === "0") {
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
      const separaterIndex = item.indexOf("=");
      if (separaterIndex === -1) {
        continue;
      }
      const key = item.slice(0, separaterIndex).trim();
      const value = item.slice(separaterIndex + 1).trim();
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
      unsafeDomains: unsafeDomains,
      attachments: unsafeFiles,
      common,
    };
  }
}
