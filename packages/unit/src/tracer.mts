import {wrap} from "@typesec/tracer";

/**
 * Tracer used by the protocol layer, tagged `unit`.
 * @category tracing
 */
export const tracer = wrap("unit");
