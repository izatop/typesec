export type EnvModeType = "production" | "development" | "stage" | "test";

declare module "bun" {
    export interface Env {
        NODE_ENV?: EnvModeType | string;
    }
}
