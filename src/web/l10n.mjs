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

  static get(language) {
    return this.instances[language] || (this.instances[language] = new L10n(language));
  }

  constructor(language) {
    this.language = (language || "en-US").toLowerCase();
    this.loaded = this.load().then(() => true);
  }

  async load() {
    try {
      const [locale, fallbackLocale, defaultLocale] = await Promise.all([
        this.loadLocale(this.language),
        this.loadLocale(this.locale.split("-")[0]),
        this.loadLocale("en-US"),
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

  async loadLocale(language) {
    if (L10n.cache[language]) return L10n.cache[language];

    return (L10n.requests[language] = L10n.requests[language] || this.loadLocaleInternal(language));
  }
  async loadLocaleInternal(language) {
    if (L10n.cache[language]) return L10n.cache[language];
    const url = `locales/${language}.json`;
    const response = await fetch(url);
    if (response.ok) {
      const locale = await response.json();
      return (L10n.cache[language] = locale || {});
    }
    return null;
  }

  get(key, params = {}) {
    let message = this.locale[key] || this.fallbackLocale[key] || this.defaultLocale[key];
    if (params) {
      for (const [placeholder, value] of Object.entries(params)) {
        message = message.replace("${" + placeholder + "}", value || "");
      }
    }
    return message;
  }
}
