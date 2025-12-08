import {domain} from "../domain.mts";
import {StringCountContract} from "./contracts.mts";

export const TestDomain = domain("TestDomain", {
    strings: {
        count: StringCountContract,
    },
});
