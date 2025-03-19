import { defineConfig } from "eslint/config";
import prettier from "eslint-plugin-prettier";

export default defineConfig([{
    plugins: {
        prettier,
    },

    languageOptions: {
        ecmaVersion: 2020,
        sourceType: "module",

        parserOptions: {
            impliedStrict: true,

            ecmaFeatures: {
                impliedStrict: true,
                experimentalObjectRestSpread: true,
            },
        },
    },

    rules: {
        "prettier/prettier": "error",
    },
}]);