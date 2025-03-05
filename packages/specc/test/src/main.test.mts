import test, {describe} from "node:test";
import {TCheckListSpecRef, TTodoSpecChecklistInputRef, TTodoSpecRef, TUserSpecRef} from "./main.ref.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("Compiler", () => {
    test("Reflection", (t) => {
        t.assert.snapshot(TUserSpecRef);
        t.assert.snapshot(TCheckListSpecRef);
        t.assert.snapshot(TTodoSpecChecklistInputRef);
        t.assert.snapshot(TTodoSpecRef);
    });
});
