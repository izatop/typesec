import {describe, expect, it} from "bun:test";
import assert from "node:assert";
import {composer} from "./composer.mts";
import {list} from "./proto.mts";
import {scalars} from "./scalars.mts";

describe("Composer", async () => {
    it("scalars", async () => {
        const shouldPass = "Test";
        const shouldFail = null;
        const passed = await composer.composeScalar(scalars.string, shouldPass);

        expect(passed).toEqual({
            type: scalars.string,
            value: shouldPass,
        });

        expect(composer.composeScalar(scalars.string, shouldFail)).rejects.toThrowError();
    });

    it("list", async () => {
        const values = ["Test", null];

        const strings = list(scalars.string);
        const {
            type,
            value: [pass, fail],
        } = await composer.composeList(strings, values);

        expect(type).toEqual(strings);
        expect(pass).toEqual({type: scalars.string, value: "Test", defect: undefined});

        assert(fail?.defect === true);
        expect(fail.defect).toBeTrue();
        expect(fail.type).toEqual(null);
        expect(fail.input).toEqual(null);
        expect(fail.reason).toBeInstanceOf(Error);
    });
});
