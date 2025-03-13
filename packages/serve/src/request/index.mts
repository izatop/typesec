import * as v from "valibot";

const json = v.pipeAsync(
    v.instance(Request),
    v.check(({headers}) => headers.get("content-encoding")?.startsWith("application/json") === true),
    v.transformAsync((v) => v.json()),
    v.any(),
);

export const request = {
    json,
};
