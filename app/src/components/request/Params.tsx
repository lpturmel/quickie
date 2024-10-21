import { Component, For } from "solid-js";
import Entry from "../Entry";
import { request } from "../../utils/state";

const Params: Component = () => {
    return (
        <div class="flex flex-col h-full">
            <For each={request.params}>
                {(_, index) => <Entry index={index()} />}
            </For>
        </div>
    )
}

export default Params;
