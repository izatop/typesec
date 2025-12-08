import {describe, expect, test} from "bun:test";
import {contract} from "./contract.mts";
import {domain} from "./domain.mts";

describe("Domain", () => {
    test("should work", async () => {
        const N1 = "Test1";
        const R1 = {c1: contract({})};
        expect(domain(N1, R1)).toEqual({name: N1, root: R1});

        const N2 = "Test2";
        const R2 = {c1: new Date()};
        expect(() => domain(N2, R2)).toThrowError();
    });
});
