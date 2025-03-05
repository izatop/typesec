import {action} from "../../../../src/index.mjs";
import {IAppContext} from "./context.mjs";

interface State extends IAppContext {
    plus: number;
}

export default action<State, number>({
    run({rand, plus}) {
        return rand + plus;
    },
});
