import {describe, expect, test} from "bun:test";
import z from "zod";
import {subscription} from "../../subscription.mjs";

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
});
