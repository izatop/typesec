import {describe, expect, test} from "bun:test";
import {context} from "./index.mjs";
import {TestProto} from "./test/TestProto.mts";
import {createContext} from "./test/context.mts";

describe("Unit", () => {
    test("test", async () => {
        const factory = context({
            name: "Test",
            description: "Test app",
            context: createContext(),
            proto: TestProto,
        });

        const main = factory({
            name: "Test",
            description: "Test unit",
            async handle({context, proto}) {
                proto.push(context.version);
            },
        });

        const queue: unknown[] = [Math.random()];
        await main(queue);

        expect(queue).toEqual([queue[0], createContext().version, TestProto.disposed]);
    });
});
