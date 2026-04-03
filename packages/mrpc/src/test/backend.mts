import {procedure} from "../procedure.mjs";
import {backend} from "./context.mjs";
import {AsyncContract, StringCountContract} from "./contracts.mjs";
import {TestDomain} from "./domain.mjs";

export const MyBackend = backend(TestDomain, {
    strings: {
        count: procedure(StringCountContract, ({input}) => input.length),
        async: procedure(AsyncContract, async () => Math.random()),
        // generator: procedure(AsyncGeneratorContract, async function* ({input: {chars, max}}) {
        //     for (let i = 0; i < max; i++) {
        //         yield chars[Math.floor(Math.random() * chars.length)];
        //     }
        // }),
    },
});
