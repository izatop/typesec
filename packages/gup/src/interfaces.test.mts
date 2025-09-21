import {isXEqualToY} from "@typesec/the/test";
import type {Arrayify} from "@typesec/the/type";
import {describe, expect, it} from "bun:test";
import type {PrimitiveAny, Primitives} from "./interfaces.mts";

describe("interfaces", () => {
    it("should fix primitives", () => {
        expect(isXEqualToY<Primitives, string | boolean | number>(true));
    });

    it("should fix arraify/nullable primitives", () => {
        expect(isXEqualToY<PrimitiveAny, Arrayify<Primitives | null>>(true));
    });
});
