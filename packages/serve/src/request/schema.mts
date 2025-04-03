import * as v from "valibot";
import {ReuseRequest} from "./ReuseRequest.mjs";

const Preflight = v.pipe(
    v.instance(Request),
    v.transform((request) => new ReuseRequest(request)),
);

const PreflightJson = v.pipe(
    Preflight,
    v.check(({request: {headers}}) => headers.get("content-type")?.startsWith("application/json") === true),
);

const Json = v.pipeAsync(
    PreflightJson,
    v.transformAsync((request) => request.json()),
    v.any(),
);

const Text = v.pipeAsync(
    Preflight,
    v.transformAsync((value) => value.text()),
    v.any(),
);

export const request = {
    Json,
    Text,
    Preflight,
};
