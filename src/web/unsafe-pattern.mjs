/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) 2026 ClearCode Inc.
*/
"use strict";

function unescapePattern(pattern) {
  return pattern.replace(/\\=/g, "=");
}

// Split a line of the unsafe domains/files config to the pattern and its optional message.
//   "example.com = message" => { pattern: "example.com", message: "message" }
//   "example.com"           => { pattern: "example.com", message: "" }
// "=" in the pattern must be escaped as "\=".
//   "a\=b@example.com = message" => { pattern: "a=b@example.com", message: "message" }
export function parsePatternLine(line) {
  // A backslash is always consumed with the next character, so an escaped "=" never becomes the separator.
  const match = line.match(/^((?:\\.|[^=\\])*)=(.*)$/);
  if (!match) {
    return { pattern: unescapePattern(line).trim(), message: "" };
  }
  return {
    pattern: unescapePattern(match[1]).trim(),
    message: match[2].trim(),
  };
}
