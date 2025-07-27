import {describe, test} from "bun:test";
import * as assert from "node:assert";
import {createContext} from "node:vm";
import {context} from "./index.mjs";
import {TestProto} from "./test/TestProto.mts";

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
