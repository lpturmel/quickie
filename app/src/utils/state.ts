import { createStore } from "solid-js/store";

interface Entry {
    enabled: boolean;
    name: string;
    value: string;
}
interface RequestState {
    params: Entry[];
    headers: Entry[];
}
export const [request, setRequest] = createStore<RequestState>({
    params: [
        { enabled: true, name: "", value: "" },
    ],
    headers: [{ enabled: true, name: "", value: "" }],
});
