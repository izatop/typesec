import type {BunRequest} from "bun";
import z from "zod";
import {ReuseRequest} from "./ReuseRequest.mjs";

/** Wraps the request so its body can be read more than once. */
const Preflight = z.instanceof(Request).transform((request) => ReuseRequest.factory(request as BunRequest));

const PreflightJson = Preflight.refine(
    ({request: {headers}}) => headers.get("content-type")?.startsWith("application/json") === true,
);

/** Parses a JSON body. */
const Json = PreflightJson.transform<unknown>((r) => r.json());

/** Reads a JSON-typed body as text. */
const Text = PreflightJson.transform<string>((r) => r.text());

/**
 * Zod schemas that turn a request into its parsed body.
 *
 * `Preflight` yields a reusable request, while `Json` and `Text` also require a JSON content type. Use them as route transforms through `Router.use`.
 * @category http
 * @example route({app, name}).use({body: useBody(request.Json.pipe(UserType))})
 */
export const request = {
    Json,
    Text,
    Preflight,
};
