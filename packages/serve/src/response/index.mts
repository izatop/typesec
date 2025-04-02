import * as v from "valibot";

const json = v.pipe(
    v.any(),
    v.transform((value) => JSON.stringify(value)),
    v.transform((value) => new Response(value, {headers: {"content-type": "application/json"}})),
);

export const response = {
    json,
};
