import {describe, expect, it} from "bun:test";
import {async} from "./async.mts";

const agf = async function* () {};
const ag = agf();

describe("async", () => {
    it("isPromise(value)", () => {
        expect(async.isPromise(Promise.resolve(1))).toBeTrue();
        expect(async.isPromise({})).toBeFalse();
    });

    it("isAsyncGenerator(value)", () => {
        expect(async.isAsyncGenerator(ag)).toBeTrue();
        expect(async.isAsyncGenerator({})).toBeFalse();
    });

    it("isAsyncGeneratorFunction(value)", () => {
        expect(async.isAsyncGeneratorFunction(agf)).toBeTrue();
        expect(async.isAsyncGeneratorFunction(it)).toBeFalse();
    });
});
