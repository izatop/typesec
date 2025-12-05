import type {BunRequest} from "bun";
import z from "zod";
import {ReuseRequest} from "./ReuseRequest.mjs";

const Preflight = z.instanceof(Request).transform((request) => ReuseRequest.factory(request as BunRequest));

const PreflightJson = Preflight.refine(
    ({request: {headers}}) => headers.get("content-type")?.startsWith("application/json") === true,
);

const Json = PreflightJson.transform<unknown>((r) => r.json());

const Text = PreflightJson.transform<string>((r) => r.text());

export const request = {
    Json,
    Text,
    Preflight,
};
