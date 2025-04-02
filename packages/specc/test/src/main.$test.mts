import {describe, expect, test} from "bun:test";
import {TCheckListSpecRef, TTodoSpecChecklistInputRef, TTodoSpecRef, TUserSpecRef} from "./main.ref.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("Compiler", () => {
    test("Reflection", () => {
        expect(TUserSpecRef).toMatchSnapshot();
        expect(TCheckListSpecRef).toMatchSnapshot();
        expect(TTodoSpecChecklistInputRef).toMatchSnapshot();
        expect(TTodoSpecRef).toMatchSnapshot();
    });
});
