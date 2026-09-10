/**
 * The signals the lifecycle controller traps to start a graceful shutdown.
 * @category runtime
 */
export const ExitSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
