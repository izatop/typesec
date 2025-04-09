import {expect, test} from "bun:test";
import {ArgvParser} from "../../src/index.mjs";

test("argv", () => {
    const argv = new ArgvParser({});
    const res = argv.option("-f, --foo <foo>");
    expect(res.parse(["-f", "value"])).toEqual({foo: "value"});
    expect(res.parse(["--foo", "value2"])).toEqual({foo: "value2"});
});
