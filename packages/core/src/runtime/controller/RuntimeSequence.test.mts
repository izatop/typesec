import {describe, expect, test} from "bun:test";
import {RuntimeSequence} from "./RuntimeSequence.mts";

describe("RuntimeSequence", () => {
    test("should increement", async () => {
        const t1 = {};
        const t2 = {};
        const v1 = RuntimeSequence.increment(t1);
        const v2 = RuntimeSequence.increment(t1);
        const v3 = RuntimeSequence.increment(t2);
        expect(v1).toEqual(0);
        expect(v2).toEqual(1);
        expect(v3).toEqual(0);
    });
});
