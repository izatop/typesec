import {expect, test} from "bun:test";
import {Ref} from "./Ref.mjs";

test("ensure()", async () => {
    const ref = new Ref(() => Math.random());
    expect(ref.ensure()).toBeTypeOf("number");
    expect(ref.ensure()).toBe(ref.ensure());
});
