import {describe, expect, test} from "bun:test";
import z from "zod";
import {subscription} from "./subscription.mts";
import {MyBackend} from "./test/backend.mts";

describe("iterator", () => {
    test("test", async () => {
        async function* ag() {
            let i = 0;
            while (i++ < 10) yield `n ${i}`;
            yield 1;
        }

        const sub = subscription(z.string());
        const s = sub.parse(ag());

        const values: (string | unknown)[] = [];
        try {
            for await (const e of s) {
                values.push(e);
            }
        } catch (cause) {
            values.push(cause);
        }

        expect(values).toMatchSnapshot();
    });

    test("Contract", async () => {
        const backend = MyBackend.createStatic(Math);
        const res = [];
        const max = 127 - 32;
        const chars = Array.from<number>({length: max})
            .fill(32)
            .map((c, i) => String.fromCharCode(c + i));

        for await (const char of backend.strings.generator({max: 10, chars})) {
            res.push(char);
        }

        expect(res.length).toEqual(10);
        expect(chars).toContainValues(res);
    });
});
