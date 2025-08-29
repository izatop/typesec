import {isXEqualToY} from "@typesec/the/test";
import type {Prop} from "@typesec/the/type";
import {describe, expect, it} from "bun:test";
import type {Member} from "./member.mts";
import type {Subject} from "./subject.mts";

describe("Subject", () => {
    it("should declare primitive members", () => {
        type Source = {
            string: string;
            boolean: boolean;
            number: number;
        };

        type TestSubject = Subject<Source>;
        type TestString = Prop<TestSubject, "string">;
        type TestBoolean = Prop<TestSubject, "boolean">;
        type TestNumber = Prop<TestSubject, "number">;

        expect(isXEqualToY<TestString, Member<string>>(true)).toBeTrue();
        expect(isXEqualToY<TestBoolean, Member<boolean>>(true)).toBeTrue();
        expect(isXEqualToY<TestNumber, Member<number>>(true)).toBeTrue();
    });

    it("should normalize nullable members", () => {
        type Source = {
            v1: string | null;
            v2?: string;
            v3?: string | null | undefined;
        };

        type Result = {
            v1: Member<string | null>;
            v2: Member<string | null>;
            v3: Member<string | null>;
        };

        type Test = Subject<Source>;

        expect(isXEqualToY<Test, Result>(true)).toBeTrue();
    });

    it("should work with array members", () => {
        type Source = {
            v1: Member<string[]>;
        };

        type Test = Subject<Source>;

        expect(isXEqualToY<Test, Source>(true)).toBeTrue();
    });

    it("should work with Node members", () => {
        type Source = {
            v1: Member<string>;
        };

        type Test = Subject<Source>;

        expect(isXEqualToY<Test, Source>(true)).toBeTrue();
    });
});
