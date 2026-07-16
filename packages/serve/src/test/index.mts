import {context} from "@typesec/unit";
import {ServeProto} from "../index.mjs";

export const app = context({
    name: "Test",
    proto: ServeProto.configure({port: 0}),
    context: {version: 1},
});

export default app;
