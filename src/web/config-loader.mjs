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
      const regex = /^([^=]+)=(.*)$/;
      const match = item.match(regex);
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
}
