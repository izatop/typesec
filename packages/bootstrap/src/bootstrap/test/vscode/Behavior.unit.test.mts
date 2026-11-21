import {describe, expect, test} from "bun:test";

import {mergeVscodeSettings} from "../../vscode.mjs";

describe("mergeVscodeSettings", () => {
    test("merges nested settings, replaces arrays and removes literal keys after merging", () => {
        const current = JSON.stringify({
            "files.exclude": {"**/local": true, "**/dist": false},
            "custom.list": ["local"],
            "custom.value": null,
            "old.setting": true,
            old: {setting: "keep"},
        });

        const template = JSON.stringify({
            "files.exclude": {"**/dist": true},
            "custom.list": ["template"],
            "custom.value": {enabled: true},
            "old.setting": false,
        });

        const result = mergeVscodeSettings(current, template, '["old.setting", "absent"]');

        expect(JSON.parse(result)).toEqual({
            "files.exclude": {"**/local": true, "**/dist": true},
            "custom.list": ["template"],
            "custom.value": {enabled: true},
            old: {setting: "keep"},
        });

        expect(JSON.parse(current)["old.setting"]).toBeTrue();
    });

    test("preserves comments and formatting when no settings change", () => {
        const current = '{ // keep this comment\n "editor.formatOnSave": true,\n}\n';

        const result = mergeVscodeSettings(current, '{"editor.formatOnSave": true}', "[]");

        expect(result).toBe(current);
    });

    test("rejects malformed settings and deletion lists", () => {
        expect(() => mergeVscodeSettings("{", "{}", "[]")).toThrow();
        expect(() => mergeVscodeSettings("[]", "{}", "[]")).toThrow("must contain an object");
        expect(() => mergeVscodeSettings("{}", "null", "[]")).toThrow("must contain an object");
        expect(() => mergeVscodeSettings("{}", "{}", "{}")).toThrow("array of setting names");
        expect(() => mergeVscodeSettings("{}", "{}", "[1]")).toThrow("array of setting names");
    });

    test("ignores object key order inside arrays when checking for changes", () => {
        const current = '{ // keep this comment\n "formatters": [{"languages": ["sql"], "command": "format"}]\n}\n';
        const template = '{"formatters": [{"command": "format", "languages": ["sql"]}]}';

        const result = mergeVscodeSettings(current, template, "[]");

        expect(result).toBe(current);
    });
});
