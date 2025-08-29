import { defineConfig, globalIgnores } from "eslint/config";
import _import from "eslint-plugin-import";
import officeAddins from "eslint-plugin-office-addins";
import { fixupPluginRules } from "@eslint/compat";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsEsLint from "typescript-eslint";

export default defineConfig([
    ...tsEsLint.configs.recommended,
    ...officeAddins.configs.recommended,
    globalIgnores(["dist/*"]), {
    plugins: {
        import: fixupPluginRules(_import),
        "office-addins": officeAddins,
    },

    languageOptions: {
        parser: tsParser,
        globals: {
            ...globals.browser,
            Office: "readonly",
            $: "readonly",
            DOMPurify: "readonly"
        },
    },

    rules: {
        "no-const-assign": "error",
        "prefer-const": ["warn", {
            destructuring: "any",
            ignoreReadBeforeAssign: false,
        }],
        "no-var": "error",
        "no-unused-vars": ["warn", {
            vars: "all",
            args: "after-used",
            argsIgnorePattern: "^_",
            caughtErrors: "all",
            caughtErrorsIgnorePattern: "^_",
        }],

        "no-use-before-define": ["error", {
            functions: false,
            classes: true,
        }],

        "no-unused-expressions": "error",
        "no-unused-labels": "error",

        "no-undef": ["error", {
            typeof: true,
        }],

        "import/default": "error",
        "import/namespace": "error",
        "import/no-duplicates": "error",
        "import/export": "error",
        "import/extensions": ["error", "always"],
        "import/first": "error",
        "import/named": "error",
        "import/no-named-as-default": "error",
        "import/no-named-as-default-member": "error",
        "import/no-cycle": ["warn", {}],
        "import/no-self-import": "error",
        "import/no-unresolved": ["error", {
            caseSensitive: true,
        }],
        "import/no-useless-path-segments": "error",
    },
}]);