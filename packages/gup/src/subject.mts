import type {KeyOf, Rec, ToNullish} from "@typesec/the/type";
import type {PrimitiveAny} from "./interfaces.mts";
import type {Member} from "./member.mts";

export type Subject<T extends Rec> = {
    [K in KeyOf<T>]-?: Subject.MemberFactory<ToNullish<T[K]>>;
};

export namespace Subject {
    export type MemberFactory<T> = [T] extends [PrimitiveAny] ? Member<T> : Member.Is<T> extends true ? T : never;
}
