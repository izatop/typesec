import type {MemberType, Spec} from "@typesec/spec";

export class Reflection<TSpec extends Spec.Any> {
    declare public readonly spec: TSpec;

    public readonly name: string;

    public readonly members: MemberType[];

    constructor(name: string, members: MemberType[]) {
        this.name = name;
        this.members = members;
    }
}
