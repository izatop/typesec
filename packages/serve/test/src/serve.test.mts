import {runtime} from "@typesec/core";
import {getApplication} from "@typesec/unit";
import {expect, test} from "bun:test";
import {resolve} from "node:path";
import {ServeProto} from "../../src/index.mjs";

test("serve", async () => {
    const path = resolve(import.meta.dirname, "test/app");
    const app = getApplication(await import("./test/index.mjs"));
    const pending = app.proto.run({path});

    const {
        instances: [server],
    } = ServeProto;

    const r200 = await server.fetch(new Request("http://localhost:3000/"));
    expect(r200.status).toBe(200);

    const r404 = await server.fetch(new Request("http://localhost:3000/404"));
    expect(r404.status).toBe(404);

    const userId = await server.fetch(new Request("http://localhost:3000/user/1"));
    expect(userId.status).toBe(200);
    expect(await userId.json()).toEqual({id: 1});

    runtime.abort();
    await pending;
});
