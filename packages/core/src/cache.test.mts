import {expect, test} from "bun:test";
import {describe} from "node:test";
import {persist} from "./cache.mts";

describe("cache", () => {
    test("should persist string key", async () => {
        const key = "key";
        const random = async () => Math.random();
        const v1 = await persist(key, random);
        expect(v1).toBeTypeOf("number");
        expect(await persist(key, random)).toBe(v1);
    });

    test("should persist using a function key", async () => {
        const key = function myFn() {};
        const random = async () => Math.random();
        const v1 = await persist(key, random);
        expect(v1).toBeTypeOf("number");
    });

    test("should persist using a class key", async () => {
        const key = class Foo {};
        const random = async () => Math.random();
        const v1 = await persist(key, random);
        expect(v1).toBeTypeOf("number");
    });

    test("should persist using named keys", async () => {
        const key = {name: "key"};
        const random = async () => Math.random();
        const v1 = await persist(key, random);
        expect(v1).toBeTypeOf("number");
    });
});
