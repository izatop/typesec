import {ProtoAbstract} from "../ProtoAbstract.mts";

export class TestProto extends ProtoAbstract<unknown[]> {
    public static readonly disposed = "disposed";

    public static validate(value: unknown): value is void {
        return value === void 0;
    }

    public push(context: unknown): void {
        this.input.push(context);
    }

    async [Symbol.asyncDispose]() {
        this.input.push(TestProto.disposed);
    }

    public static async run(): Promise<void> {
        // do nothing
    }
}
