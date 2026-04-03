import {describe, expect, test} from "bun:test";
import {client} from "./client.mjs";
import {MyBackend} from "./test/backend.mjs";
import {TestDomain} from "./test/domain.mjs";

describe("Client", () => {
    test("test", async () => {
        const myClient = client(TestDomain, {
            query: async ({query}) => ({
                code: 200,
                data: await MyBackend.execute(Math, query),
            }),
        });

        const testString = "hello";
        const result = await myClient.query({
            strings: {
                count: [testString],
            },
        });

        expect(result).toEqual({strings: {count: testString.length}});
    });
});
