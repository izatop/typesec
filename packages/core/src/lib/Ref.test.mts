import {expect, test} from "bun:test";
import {Ref} from "./Ref.mts";

test("ensure()", async () => {
    const ref = new Ref(() => Math.random());
    expect(ref.ensure()).toBeTypeOf("number");
    expect(ref.ensure()).toBe(ref.ensure());
});
