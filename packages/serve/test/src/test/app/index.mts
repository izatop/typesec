import {app} from "../index.mjs";

export default app({
    name: "Hello",
    handle() {
        return new Response("Hello", {status: 200});
    },
});
