import {describe, expect, it} from "bun:test";
import {async} from "./async.mjs";

const agf = async function* () {};
const ag = agf();

describe("async", () => {
    it("isPromise(value)", () => {
        expect(async.isPromise(Promise.resolve(1))).toBeTrue();
        expect(async.isPromise({})).toBeFalse();
    });

    it("isPromiseLike(value)", () => {
        // oxlint-disable-next-line unicorn/no-thenable
        const objectThenable = {then: (resolve: (value: number) => void) => resolve(1)};

        expect(async.isPromiseLike(objectThenable)).toBeTrue();
        // oxlint-disable-next-line unicorn/no-thenable
        expect(async.isPromiseLike({then: 1})).toBeFalse();
        expect(async.isPromiseLike({})).toBeFalse();
    });

    it("isThenable(value)", () => {
        expect(async.isThenable(Promise.resolve(1))).toBeTrue();
        // oxlint-disable-next-line unicorn/no-thenable
        expect(async.isThenable({then: (resolve: (value: number) => void) => resolve(1)})).toBeTrue();
        // oxlint-disable-next-line unicorn/no-thenable
        expect(async.isThenable({then: false})).toBeFalse();
        expect(async.isThenable(1)).toBeFalse();
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
