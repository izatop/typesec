import {describe, expect, it} from "bun:test";
import {async} from "./async.mjs";

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

    it("isAsyncFunction(value)", () => {
        expect(async.isAsyncFunction(async () => 1)).toBeTrue();
        expect(async.isAsyncFunction(() => Promise.resolve(1))).toBeFalse();
    });

    it("isAsyncGeneratorFunction(value)", () => {
        expect(async.isAsyncGeneratorFunction(agf)).toBeTrue();
        expect(async.isAsyncGeneratorFunction(it)).toBeFalse();
    });
});
