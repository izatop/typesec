import {wrap} from "@typesec/tracer";

/**
 * Tracer used by the core runtime, tagged `core`.
 * @category tracing
 */
export const tracer = wrap("core");
