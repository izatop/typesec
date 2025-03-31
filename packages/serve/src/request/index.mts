import * as v from "valibot";

const preflight = v.pipeAsync(v.instance(Request));

const json = v.pipeAsync(
    preflight,
    v.check(({headers}) => headers.get("content-type")?.startsWith("application/json") === true),
    v.transformAsync((v) => v.json()),
    v.any(),
);

export const request = {
    json,
    preflight,
};
