import z from "zod";

const Json = z.any().transform((v) => new Response(JSON.stringify(v), {headers: {"content-type": "application/json"}}));

export const response = {
    Json,
};
