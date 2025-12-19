import z from "zod";
import {contract} from "../contract.mts";
import {subscription} from "../subscription.mts";

export const StringCountContract = contract({input: z.string(), output: z.number()});

export const AsyncGeneratorContract = contract({
    input: z.object({max: z.int(), chars: z.array(z.string().min(1).max(1))}),
    output: subscription(z.string()),
});
