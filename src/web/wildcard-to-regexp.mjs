/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export function wildcardToRegexp(source) {
  // https://stackoverflow.com/questions/6300183/sanitize-string-of-regex-characters-before-regexp-build
  const sanitized = source.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&');

  const wildcardAccepted = sanitized.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');

  return wildcardAccepted;
}
