import z from "zod";

/** Serialises any value as a JSON response. */
const Json = z.any().transform((v) => new Response(JSON.stringify(v), {headers: {"content-type": "application/json"}}));

/**
 * Zod schemas that turn a handler's value into a `Response`.
 * @category http
 * @example route({app, name}).as(z.pipe(UserType, response.Json)).get(handle)
 */
export const response = {
    Json,
};
