import {Unit} from "../../../../src/index.mjs";

export interface IAppContext {
    rand: number;
}

export const CONTEXT_NUM = Math.random();

export const context = new Unit<IAppContext>({rand: CONTEXT_NUM});
