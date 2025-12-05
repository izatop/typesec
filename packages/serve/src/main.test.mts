import {runtime} from "@typesec/core";
import {getApplication} from "@typesec/unit";
import {describe, expect, test} from "bun:test";
import {resolve} from "node:path";
import {response} from "./index.mjs";

describe("Main", () => {
    test("Server", async () => {
        using _ = runtime.use();

        const path = resolve(import.meta.dirname, "test/app");
        const app = getApplication(await import("./test/index.mjs"));
        app.proto.run({path});

        const r200 = await fetch(new Request("http://localhost:3000/"));
        expect(r200.status).toBe(200);

        const r404 = await fetch(new Request("http://localhost:3000/404"));
        expect(r404.status).toBe(404);

        const userId = await fetch(new Request("http://localhost:3000/user/1"));
        expect(userId.status).toBe(200);
        expect(await userId.json()).toEqual({id: 1, name: "Dave"});

        const update = await fetch(
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
        const resp = response.Json.parse(1);
        expect(resp.headers.has("content-type")).toBeTrue();
        expect(resp.headers.get("content-type")).toBe("application/json");
        expect(await resp.json()).toBe(1);
    });
});
