import {deepEquals} from "bun";
import {describe, expect, it} from "bun:test";
import {defnify, fn, fnify, invoke, is, isInstance, isNullable, when} from "./fn.mjs";

describe("fn utils", () => {
    it("is(value, type)", () => {
        expect(is("foo", "string")).toBeTrue();
        expect(is(1, "string")).toBeFalse();

        expect(is(1, "number")).toBeTrue();
        expect(is(true, "boolean")).toBeTrue();
        expect(is(BigInt(1), "bigint")).toBeTrue();
        expect(is(Symbol("s"), "symbol")).toBeTrue();
        expect(is(undefined, "undefined")).toBeTrue();

        expect(is({}, "object")).toBeTrue();
        expect(is(null, "object")).toBeTrue();
    });

    it("isInstance(value)", () => {
        expect(isInstance({})).toBeTrue();
        expect(isInstance([])).toBeTrue();
        expect(isInstance(null)).toBeFalse();
        expect(isInstance(1 as unknown)).toBeFalse();
    });

    it("isNullable(value)", () => {
        expect(isNullable(null)).toBeTrue();
        expect(isNullable(undefined)).toBeTrue();
        expect(isNullable(0 as unknown)).toBeFalse();
        expect(isNullable("" as unknown)).toBeFalse();
    });

    it("fnify(value)", () => {
        const value = 42;
        const wrapped = fnify(value);
        expect(typeof wrapped).toBe("function");
        expect(wrapped()).toBe(42);

        const original = () => 7;
        const same = fnify(original);
        expect(same).toBe(original);
        expect(same()).toBe(7);
    });

    it("defnify(value)", () => {
        expect(defnify(100)).toBe(100);
        expect(defnify(() => 5)).toBe(5);
    });

    it("when<T, R1, R2>(value, then, ?fallback)", () => {
        const tests = [
            ["", false],
            [false, false],
            [1, true],
            ["foo", true],
            [true, true],
            [{}, true],
            [[], true],
        ];

        const expected = tests.map(([value]) =>
            when(
                value,
                () => true,
                () => false,
            ),
        );

        deepEquals(
            expected,
            tests.map(([, res]) => res),
        );
    });

    it("invoke(target, args)", () => {
        expect(invoke("hello")).toEqual("hello");
        expect(invoke((name: string) => `hello ${name}`, "world")).toEqual("hello world");
        expect(invoke((a: number, b: number) => String(a + b), 1, 2)).toEqual("3");
    });

    it("fn.once memoizes result and call", () => {
        let called = 0;
        const source = () => {
            called += 1;
            return Math.random();
        };
        const once = fn.once(source);

        const r1 = once();
        const r2 = once();
        expect(r1).toBe(r2);
        expect(called).toBe(1);
    });

    it("toStringValue formats various inputs", () => {
        expect(fn.toStringValue(null)).toBe("null");
        expect(fn.toStringValue(undefined)).toBe("undefined");
        expect(fn.toStringValue(1n)).toBe('"1n"');
        expect(fn.toStringValue(Symbol.for("x")).includes("Symbol(")).toBeTrue();
        const d = new Date("2020-01-01T00:00:00.000Z");
        expect(fn.toStringValue(d)).toBe("2020-01-01T00:00:00.000Z");
        // invalid date falls back to toString()
        const bad = new Date("invalid");
        expect(fn.toStringValue(bad)).toBe(bad.toString());
        // JSON.stringify fallback
        const circular: any = {};
        circular.self = circular;
        const res = fn.toStringValue(circular);
        expect(typeof res).toBe("string");
    });

    it("isFunction (deprecated) still detects functions", () => {
        expect(is(() => 1, "function")).toBeTrue();
        expect(is(1, "function")).toBeFalse();
    });
});
