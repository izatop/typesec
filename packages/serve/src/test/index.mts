import {context} from "@typesec/unit";
import {ServeProto} from "../index.mjs";

export const app = context({
    name: "Test",
    proto: ServeProto,
    context: {version: 1},
});

export default app;
