/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2025 ClearCode Inc.
*/

import { Config } from "./config.mjs";

export class ConfigLoader {
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
      case "text": {
        return valueStr;
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

  // Parse INI like file
  // The difference from the common INI format is that
  // we only support "#" comment out, not support ";" comment out.
  static parseIni(str, paramDefs, defaultSection) {
    if (!str) {
      return {};
    }
    const configArray = this.toArray(str);
    let section = defaultSection;
    const result = {};
    for (const item of configArray) {
      if (/^\[.*\]$/.test(item)) {
        const match = item.match(/^\[(.*)\]$/);
        section = match[1];
        continue;
      }
      if (!section) {
        continue;
      }
      if (!result[section]) {
        result[section] = {};
      }
      const parsed = this.parseKeyValue(paramDefs, item);
      if (parsed) {
        result[section][parsed.key] = parsed.value;
      }
    }
    return result;
  }

  // Input example:
  //  [WARNING]
  //  a@example.com
  //  [BLOCK]
  //  b@example.com
  // Result example:
  //   { "WARNING": ["a@example.com"],
  //     "BLOCK": ["b@example.com"] }
  static parseSectionableArray(str, sectionDefs, defaultSection) {
    const configArray = this.toArray(str);
    let section = defaultSection;
    const result = {};
    for (const item of configArray) {
      if (/^\[.*\]$/.test(item)) {
        const match = item.match(/^\[(.*)\]$/);
        const newSection = match[1].toUpperCase();
        if (sectionDefs.includes(newSection)) {
          section = newSection;
        }
        continue;
      }
      if (section == null) {
        continue;
      }
      if (!result[section]) {
        result[section] = [];
      }
      result[section].push(item);
    }
    return result;
  }

  static parseKeyValue(paramDefs, lineStr) {
    const match = lineStr.match(this.DICTONARY_LINE_SPLITTER);
    if (!match) {
      return null;
    }
    const key = match[1].trim();
    const valueStr = match[2].trim();
    const value = this.parseValue(paramDefs, key, valueStr);
    if (value === null) {
      return null;
    }
    return { key, value };
  }

  static parseCommonConfig(str) {
    const temporarySectionName = "Common";
    const parsedDictionary = this.parseIni(str, Config.commonParamDefs, temporarySectionName);
    return parsedDictionary[temporarySectionName] || {};
  }

  static parseUnsafeDomainsConfig(str) {
    return this.parseSectionableArray(
      str,
      Config.unsafeArraySectionDefs,
      Config.defaultUnsafeDomainsConfigSection
    );
  }

  static parseUnsafeFilesConfig(str) {
    return this.parseSectionableArray(
      str,
      Config.unsafeArraySectionDefs,
      Config.defaultUnsafeFilesConfigSection
    );
  }

  static parseUnsafeBodiesConfig(str) {
    return this.parseIni(str, Config.unsafeBodiesParamDefs, null);
  }

  static parseTrustedDomainsConfig(str) {
    return this.toArray(str);
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

  static async loadFile(url) {
    console.debug("loadFile ", url);
    try {
      const response = await fetch(url, { cache: "no-store" });
      console.debug("response:", response);
      if (!response.ok) {
        return "";
      }
      const data = await response.text();
      return data.trim();
    } catch (err) {
      console.error(err);
      return "";
    }
  }

  static async loadEffectiveConfig() {
    const [fileConfig, userConfig] = await Promise.all([
      this.loadFileConfig(),
      this.loadUserConfig(),
    ]);
    const effectiveConfig = Config.createDefaultConfig().merge(fileConfig).merge(userConfig);
    return effectiveConfig;
  }

  static async loadFileConfig() {
    const [
      trustedDomainsString,
      unsafeDomainsString,
      unsafeFilesString,
      unsafeBodiesString,
      commonString,
    ] = await Promise.all([
      this.loadFile("configs/TrustedDomains.txt"),
      this.loadFile("configs/UnsafeDomains.txt"),
      this.loadFile("configs/UnsafeFiles.txt"),
      this.loadFile("configs/UnsafeBodies.txt"),
      this.loadFile("configs/Common.txt"),
    ]);
    const trustedDomains = this.parseTrustedDomainsConfig(trustedDomainsString);
    const unsafeDomains = this.parseUnsafeDomainsConfig(unsafeDomainsString);
    const unsafeFiles = this.parseUnsafeFilesConfig(unsafeFilesString);
    const unsafeBodies = this.parseUnsafeBodiesConfig(unsafeBodiesString);
    const common = this.parseCommonConfig(commonString);
    return new Config({
      trustedDomains,
      unsafeDomains,
      unsafeFiles,
      unsafeBodies,
      common,
      trustedDomainsString,
      unsafeDomainsString,
      unsafeFilesString,
      unsafeBodiesString,
      commonString,
    });
  }

  /**
   * Load user config from roamingSettings.
   * Note tha this function does not work in the dialog context
   * because Office.context.roamingSettings does not work in the
   * dialog context as its specification.
   * @returns user data hash
   */
  static async loadUserConfig() {
    const trustedDomainsString = Office.context.roamingSettings.get("TrustedDomains")?.trim() ?? "";
    const unsafeDomainsString = Office.context.roamingSettings.get("UnsafeDomains")?.trim() ?? "";
    const unsafeFilesString = Office.context.roamingSettings.get("UnsafeFiles")?.trim() ?? "";
    const unsafeBodiesString = Office.context.roamingSettings.get("UnsafeBodies")?.trim() ?? "";
    const commonString = Office.context.roamingSettings.get("Common")?.trim() ?? "";
    const trustedDomains = this.parseTrustedDomainsConfig(trustedDomainsString);
    const unsafeDomains = this.parseUnsafeDomainsConfig(unsafeDomainsString);
    const unsafeFiles = this.parseUnsafeFilesConfig(unsafeFilesString);
    const unsafeBodies = this.parseUnsafeBodiesConfig(unsafeBodiesString);
    const common = this.parseCommonConfig(commonString);
    return new Config({
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
    });
  }
}
