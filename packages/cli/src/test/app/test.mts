import command from "../index.mjs";

export default command({
    name: "Test",
    handle({context}) {
        context.count++;
    },
});
