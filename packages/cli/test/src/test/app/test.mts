import command from "../index.mjs";

export default command({
    name: "Test",
    handle({context}) {
        console.log("version: %d", context.version);
        context.count++;
    },
});
