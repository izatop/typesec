import {describe, expect, test} from "bun:test";
import {WeakSequence} from "../../WeakSequence.mjs";

describe("WeakSequence", () => {
    test("should increement", async () => {
        const t1 = {};
        const t2 = {};
        const v1 = WeakSequence.increment(t1);
        const v2 = WeakSequence.increment(t1);
        const v3 = WeakSequence.increment(t2);
        expect(v1).toEqual(0);
        expect(v2).toEqual(1);
        expect(v3).toEqual(0);
    });
});
