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
    const url = `${baseUrl}/locales/${language}.json`;
    //console.debug("loading locale from ", url);
    const locale = await this.JSONFetcher(url);
    if (locale) {
      //console.debug("locale successfully loaded from ", url, locale);
      return (this.cache[language] = locale || {});
    }
    //console.debug("failed to load locale from ", url);
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
