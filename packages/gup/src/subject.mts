import type {KeyOf, Rec, ToNullish} from "@typesec/the/type";
import type {PrimitiveAny} from "./interfaces.mjs";
import type {Member} from "./member.mjs";

export type Subject<T extends Rec> = {
    [K in KeyOf<T>]-?: Subject.MemberFactory<ToNullish<T[K]>>;
};

export namespace Subject {
    export type MemberFactory<T> = [T] extends [PrimitiveAny] ? Member<T> : Member.Is<T> extends true ? T : never;
}
