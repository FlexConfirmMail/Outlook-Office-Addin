/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
"use strict";

export class L10n {
  static cache = {};
  static requests = {};
  static instances = {};
  static baseUrl = ".";
  static JSONFetcher = async (url) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // missing file
    }
    return null;
  };

  static get(language) {
    return this.instances[language] || (this.instances[language] = new L10n(language));
  }

  static clearCache() {
    this.cache = {};
    this.requests = {};
    this.instances = {};
  }

  constructor(language) {
    this.language = language || "en";
    this.ready = this.load().then(() => true);
  }

  async load() {
    try {
      const [locale, fallbackLocale, defaultLocale] = await Promise.all([
        L10n.loadLocale(this.language),
        L10n.loadLocale(this.language.split("-")[0]),
        L10n.loadLocale("en"),
      ]);
      this.locale = locale;
      this.fallbackLocale = fallbackLocale;
      this.defaultLocale = defaultLocale;
      return true;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  static async loadLocale(language) {
    if (this.cache[language]) {
      return this.cache[language];
    }
    return (this.requests[language] = this.requests[language] || this.loadLocaleInternal(language));
  }
  static async loadLocaleInternal(language) {
    if (this.cache[language]) {
      return this.cache[language];
    }
    const baseUrl = this.baseUrl.split("?")[0].replace(/\/([^/]+)?$/, "");
    const urlForDefault = `${baseUrl}/locales/${language}.json`;
    const urlForCustom = `${baseUrl}/custom-locales/${language}.json`;
    //console.debug("loading locale from ", urlForDefault);
    //console.debug("loading locale from ", urlForCustom);
    const [defaultLocale, customLocale] = await Promise.all([
      this.JSONFetcher(urlForDefault),
      this.JSONFetcher(urlForCustom),
    ]);
    if (defaultLocale) {
      //console.debug("locale successfully loaded from ", urlForDefault, defaultLocale);
      let locale = defaultLocale;
      if (customLocale) {
        //console.debug("locale successfully loaded from ", urlForCustom, customLocale);
        locale = { ...defaultLocale, ...customLocale };
      }
      return (this.cache[language] = locale || {});
    }
    if (customLocale) {
      //console.debug("locale successfully loaded from ", urlForCustom, customLocale);
      return (this.cache[language] = customLocale || {});
    }
    //console.debug(`failed to load locale from ${urlForDefault} and ${urlForCustom}`);
    return (this.cache[language] = {});
  }

  get(key, params = {}) {
    let message =
      key in this.locale
        ? this.locale[key]
        : key in this.fallbackLocale
          ? this.fallbackLocale[key]
          : key in this.defaultLocale
            ? this.defaultLocale[key]
            : null;
    if (message === null) {
      return key;
    }
    if (params) {
      for (const [placeholder, value] of Object.entries(params)) {
        message = message.replace("${" + placeholder + "}", value || "");
      }
    }
    return message;
  }

  translateAll() {
    for (const element of document.querySelectorAll("[data-l10n-text-content]")) {
      element.textContent = this.get(element.dataset.l10nTextContent);
    }
  }
}
