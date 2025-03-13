import {describe, test} from "bun:test";
import assert from "node:assert";
import {context} from "../../src/index.mjs";
import {TestProto} from "./unit/TestProto.mjs";
import {createContext} from "./unit/context.mjs";

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

        assert.deepEqual(queue, [queue[0], createContext().version, TestProto.disposed]);
    });
});
