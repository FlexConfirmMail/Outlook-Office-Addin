/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2026 ClearCode Inc.
*/
import { createNestablePublicClientApplication } from "@azure/msal-browser";

// Resolves recipients whose SMTP address is not available from the Office API.
//
// Recipients picked from personal contacts that hold an Exchange (EX) format
// address are returned by Office.js without a parseable SMTP address: the
// "emailAddress" is a LegacyExchangeDN (/o=.../cn=...) or an opaque id. Such a
// recipient can't be matched against trustedDomains and would be judged as an
// external recipient.
//
// The classic (VSTO) version resolved these addresses by querying the directory
// through MAPI, but Office.js has no equivalent API. Instead, this resolver
// queries Microsoft Entra ID via the Microsoft Graph API.
export class RecipientResolver {
  static GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0";
  static SCOPES = ["User.Read.All"];
  // Give up when the directory doesn't answer, to avoid blocking the
  // confirmation dialog for too long. The on-send event itself times out in
  // 5 minutes, so this must be much shorter than that.
  static TIMEOUT_MSEC = 10 * 1000;

  // Exchange Online generates a LegacyExchangeDN whose last component is a
  // 32-digit hex followed by the mailbox alias, e.g.
  //   /o=ExchangeLabs/ou=.../cn=Recipients/cn=<32-digit hex>-<alias>
  static ALIAS_IN_DN_MATCHER = /\/cn=[0-9a-f]{32}-([^/]+)$/i;

  constructor({ clientId } = {}) {
    this.clientId = clientId;
    this.$msalInstance = null;
    // Directory lookups are expensive and their results rarely change while
    // composing a mail, so results (including failures) are cached.
    this.$cache = new Map();
  }

  get available() {
    return !!this.clientId && !!Office.context.requirements.isSetSupported("NestedAppAuth", "1.1");
  }

  async getTokenAsync() {
    if (!this.$msalInstance) {
      this.$msalInstance = await createNestablePublicClientApplication({
        auth: {
          clientId: this.clientId,
          authority: "https://login.microsoftonline.com/common",
        },
      });
    }
    const request = { scopes: RecipientResolver.SCOPES };
    try {
      const result = await this.$msalInstance.acquireTokenSilent(request);
      return result.accessToken;
    } catch (error) {
      // The silent acquisition fails when the user's interaction (consent or
      // sign-in) is required.
      console.debug("acquireTokenSilent failed, falling back to popup:", error);
      const result = await this.$msalInstance.acquireTokenPopup(request);
      return result.accessToken;
    }
  }

  async queryGraphAsync(path, token) {
    const response = await fetch(`${RecipientResolver.GRAPH_ENDPOINT}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        // Filtering by proxyAddresses and searching require advanced queries.
        ConsistencyLevel: "eventual",
      },
      signal: AbortSignal.timeout(RecipientResolver.TIMEOUT_MSEC),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Graph request failed: HTTP ${response.status} ${body}`);
    }
    return response.json();
  }

  // Returns the SMTP address of the given recipient, or null if it can't be
  // determined. Users are looked up with the most reliable key first.
  async resolveAddressAsync(recipient, token) {
    const rawAddress = recipient.emailAddress || recipient.address || "";
    const displayName = recipient.displayName || "";

    // 1. The DN may be kept as an X500 proxy address of the current mailbox.
    if (rawAddress) {
      const escaped = rawAddress.replace(/'/g, "''");
      const found = await this.queryGraphAsync(
        `/users?$count=true&$select=mail&$filter=${encodeURIComponent(
          `proxyAddresses/any(p:p eq 'X500:${escaped}')`
        )}`,
        token
      );
      if (found.value?.length === 1 && found.value[0].mail) {
        return found.value[0].mail;
      }
    }

    // 2. The alias embedded in the DN can be matched against mailNickname.
    const alias = RecipientResolver.ALIAS_IN_DN_MATCHER.test(rawAddress) ? RegExp.$1 : null;
    if (alias) {
      const escaped = alias.replace(/'/g, "''");
      const found = await this.queryGraphAsync(
        `/users?$count=true&$select=mail&$filter=${encodeURIComponent(
          `mailNickname eq '${escaped}'`
        )}`,
        token
      );
      if (found.value?.length === 1 && found.value[0].mail) {
        return found.value[0].mail;
      }
    }

    // 3. Fall back to the display name. Ambiguous results are rejected, because
    //    resolving to a wrong person is worse than not resolving at all.
    if (displayName) {
      const escaped = displayName.replace(/"/g, '\\"');
      const found = await this.queryGraphAsync(
        `/users?$count=true&$select=mail&$search=${encodeURIComponent(`"displayName:${escaped}"`)}`,
        token
      );
      const withAddress = (found.value || []).filter((user) => user.mail);
      if (withAddress.length === 1) {
        return withAddress[0].mail;
      }
    }

    return null;
  }

  async resolveWithCacheAsync(recipient, token) {
    const key = recipient.emailAddress || recipient.address || recipient.displayName || "";
    if (this.$cache.has(key)) {
      return this.$cache.get(key);
    }
    let address = null;
    try {
      address = await this.resolveAddressAsync(recipient, token);
    } catch (error) {
      console.log(`Failed to resolve the address of "${key}": ${error}`);
    }
    this.$cache.set(key, address);
    return address;
  }

  // Fills in the missing SMTP addresses of the given recipients in place.
  // Recipients which already have an SMTP address are left as is, and so are
  // recipients which can't be resolved: they are still treated as untrusted.
  async resolveAllAsync(recipientsList) {
    const unresolved = recipientsList
      .flatMap((recipients) => recipients || [])
      .filter((recipient) => recipient && !recipient.domain && !!recipient.displayName);
    if (unresolved.length == 0) {
      return;
    }

    if (!this.available) {
      console.log("Skipped resolving recipients: Nested App Authentication is not available.");
      return;
    }

    let token;
    try {
      token = await this.getTokenAsync();
    } catch (error) {
      console.log(`Failed to get an access token to resolve recipients: ${error}`);
      return;
    }

    await Promise.all(
      unresolved.map(async (recipient) => {
        const address = await this.resolveWithCacheAsync(recipient, token);
        if (!address) {
          return;
        }
        console.debug(`Resolved "${recipient.displayName}" to ${address}`);
        recipient.address = address;
        recipient.domain = address.split("@")[1]?.toLowerCase() ?? "";
      })
    );
  }
}
