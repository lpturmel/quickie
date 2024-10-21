import { Component, createEffect } from "solid-js";
import { request, setRequest } from "../utils/state";

interface EntryProps {
    index: number;
}

const Entry: Component<EntryProps> = (props) => {
    const entry = () => request.params[props.index];

    const onNameChange = (e: Event) => {
        const target = e.currentTarget as HTMLInputElement;
        setRequest("params", props.index, "name", target.value);
    };

    const onValueChange = (e: Event) => {
        const target = e.currentTarget as HTMLInputElement;
        setRequest("params", props.index, "value", target.value);
    };

    createEffect(() => {
        console.log(entry);
    });

    return (
        <div class="flex items-center justify-start gap-4 border-b-[0.5px] border-base-content/20 p-2 w-full">
            <input value={entry().enabled ? "true" : "false"} type="checkbox" class="checkbox checkbox-sm checkbox-primary" checked={entry().enabled} onChange={(e) => {
                setRequest("params", (prev) => {
                    prev[props.index].enabled = e.currentTarget.checked;
                    return prev;
                });
            }} />

            <input name="name" placeholder="name" class="input input-sm input-bordered" value={entry().name} onInput={onNameChange} />
            <input name="value" placeholder="value" class="input input-sm input-bordered" value={entry().value} onInput={onValueChange} />
        </div>
    );
}
export default Entry;
