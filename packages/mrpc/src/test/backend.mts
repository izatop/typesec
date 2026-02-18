import {procedure} from "../procedure.mts";
import {backend} from "./context.mts";
import {AsyncContract, StringCountContract} from "./contracts.mts";
import {TestDomain} from "./domain.mts";

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
