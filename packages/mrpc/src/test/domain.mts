import {domain} from "../domain.mjs";
import {AsyncContract, StringCountContract} from "./contracts.mjs";

export const TestDomain = domain("TestDomain", {
    strings: {
        async: AsyncContract,
        count: StringCountContract,
        //generator: AsyncGeneratorContract,
    },
});
