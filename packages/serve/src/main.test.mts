import {runtime} from "@typesec/core";
import {assert} from "@typesec/the/assert";
import {getApplication} from "@typesec/unit";
import {describe, expect, test} from "bun:test";
import {resolve} from "node:path";
import {parse} from "valibot";
import {response, ServeProto} from "./index.mjs";

describe("Main", () => {
    test("Server", async () => {
        const path = resolve(import.meta.dirname, "test/app");
        const app = getApplication(await import("./test/index.mjs"));
        app.proto.run({path});
        using _ = runtime.use();

        const {
            instances: [server],
        } = ServeProto;

        assert(server, "Unexpected error");
        const r200 = await server.fetch(new Request("http://localhost:3000/"));
        expect(r200.status).toBe(200);

        const r404 = await server.fetch(new Request("http://localhost:3000/404"));
        expect(r404.status).toBe(404);

        const userId = await server.fetch(new Request("http://localhost:3000/user/1"));
        expect(userId.status).toBe(200);
        expect(await userId.json()).toEqual({id: 1, name: "Dave"});

        const update = await server.fetch(
            new Request("http://localhost:3000/user/1/update", {
                method: "post",
                body: JSON.stringify({name: "Mike"}),
                headers: {"content-type": "application/json"},
            }),
        );

        expect(update.status).toBe(200);
        expect(await update.json()).toEqual({id: 1, name: "Mike"});
    });

    test("Response", async () => {
        const resp = parse(response.Json, 1);
        expect(resp.headers.has("content-type")).toBeTrue();
        expect(resp.headers.get("content-type")).toBe("application/json");
        expect(await resp.json()).toBe(1);
    });
});
