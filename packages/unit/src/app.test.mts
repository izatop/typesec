import {describe, expect, test} from "bun:test";
import {getHandle} from "./app.mjs";
import {ProtoAbstract} from "./ProtoAbstract.mjs";
import {TestProto} from "./test/TestProto.mjs";

/** A routed module, as `getHandle` receives it after importing an entrypoint file. */
function entrypoint(proto: unknown) {
    return {
        default: Object.assign(() => void 0, {meta: {name: "Test"}, proto}),
    } as never;
}

describe("getHandle", () => {
    test("accepts an entrypoint declared with the same proto", () => {
        expect(getHandle(TestProto, entrypoint(TestProto))).toBeFunction();
    });

    test("accepts an entrypoint declared with a subclass, as `configure` produces one", () => {
        class ConfiguredProto extends TestProto {}

        expect(getHandle(TestProto, entrypoint(ConfiguredProto))).toBeFunction();
    });

    test("rejects an entrypoint declared with an unrelated proto", () => {
        class OtherProto extends ProtoAbstract<unknown[]> {}

        expect(() => getHandle(TestProto, entrypoint(OtherProto))).toThrowError("Wrong default export proto");
    });

    test("rejects an entrypoint declared with a superclass of the running proto", () => {
        class ConfiguredProto extends TestProto {}

        expect(() => getHandle(ConfiguredProto, entrypoint(TestProto))).toThrowError("Wrong default export proto");
    });

    test("rejects a module without a usable default export", () => {
        expect(() => getHandle(TestProto, {} as never)).toThrowError("Unknown default export");
        expect(() => getHandle(TestProto, {default: {}} as never)).toThrowError("Wrong default export type");
    });
});
