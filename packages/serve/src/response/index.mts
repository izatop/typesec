import * as v from "valibot";

const json = v.pipe(
    v.any(),
    v.transform((v) => JSON.stringify(v)),
    v.transform((v) => new Response(v, {headers: {"content-type": "application/json"}})),
);

export const response = {
    json,
};
