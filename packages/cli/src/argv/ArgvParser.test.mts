import {expect, test} from "bun:test";
import {describe} from "node:test";
import {ArgvParser} from "../index.mjs";

describe("ArgvParser", () => {
    test("option(format)", () => {
        const argv = new ArgvParser({});
        const res = argv.option("-f, --foo <foo>");
        expect(res.parse(["-f", "value"])).toEqual({foo: "value"});
        expect(res.parse(["--foo", "value2"])).toEqual({foo: "value2"});
    });

    test("require(format)", () => {
        const argv = new ArgvParser({});
        const res = argv.require("-r, --req <req>");
        expect(() => res.parse([])).toThrowError();
    });
});
