import {isXEqualToY} from "@typesec/the/test";
import type {Fn} from "@typesec/the/type";
import {describe, expect, it} from "bun:test";
import type {Member} from "./member.mts";

describe("Member", () => {
    it("Member<T> should wrap a type T to the Fn<[], T>", () => {
        type Test = Member<string>;
        expect(isXEqualToY<Test, Fn<[], string>>(true)).toBeTrue();
    });

    it("Member<T[]> should work", () => {
        type Test = Member<Date[]>;
        expect(isXEqualToY<Member.Infer<Test>, Date[]>(true)).toBeTrue();
    });

    it("Member.Is<T> should check a member", () => {
        type Test = Member<string>;
        expect(isXEqualToY<Member.Is<Test>, true>(true)).toBeTrue();
    });

    it("Member.Infer<T> should infer a member type T", () => {
        expect(isXEqualToY<Member.Infer<Member<Date>>, Date>(true)).toBeTrue();
        expect(isXEqualToY<Member.Infer<Member<Date[]>>, Date[]>(true)).toBeTrue();
        expect(isXEqualToY<Member.Infer<{}>, never>(true)).toBeTrue();
    });
});
