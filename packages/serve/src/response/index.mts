import * as v from "valibot";

export const json = v.pipe(
    v.any(),
    v.transform((v) => JSON.stringify(v)),
    v.transform((v) => new Response(v, {headers: {"Content-Type": "application/json"}})),
);

export default {
    json,
};
