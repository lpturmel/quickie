import { Component } from "solid-js";
import { request, setRequest } from "../utils/state";

interface EntryProps {
    index: number;
}

const Entry: Component<EntryProps> = (props) => {
    const entry = () => request.params[props.index];

    const onNameChange = (e: Event) => {
        const target = e.currentTarget as HTMLInputElement;
        const isLast = request.params.length === props.index + 1;
        const previousName = entry().name;

        setRequest("params", props.index, "name", target.value);

        if (previousName === "" && isLast) {
            setRequest("params", (prev) => [
                ...prev,
                { enabled: true, name: "", value: "" }
            ]);
        }

        if (target.value === "" && entry().value === "" && request.params.length > 1) {
            setRequest("params", (prev) => {
                const newParams = prev.slice(0, props.index + 1);
                return newParams;
            });
        }
    };

    const onValueChange = (e: Event) => {
        const target = e.currentTarget as HTMLInputElement;
        const isLast = request.params.length === props.index + 1;
        const previousValue = entry().value;
        setRequest("params", props.index, "value", target.value);

        if (previousValue === "" && isLast) {
            setRequest("params", (prev) => [
                ...prev,
                { enabled: true, name: "", value: "" }
            ]);

        }

        if (target.value === "" && entry().name === "" && request.params.length > 1) {
            setRequest("params", (prev) => {
                const newParams = prev.slice(0, props.index + 1);
                return newParams;
            });
        }
    };

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
