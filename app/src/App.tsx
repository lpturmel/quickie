import "./App.css";
import { createMemo, createSignal, Show } from "solid-js";
import { sendRequest, type Response } from "./utils/api";
import { friendlySize } from "./utils/http";
import Body from "./components/Body";

function App() {
    const [url, setUrl] = createSignal("");
    const [method, setMethod] = createSignal("GET");
    const [response, setResponse] = createSignal<Response | null>(null);
    const [sending, setSending] = createSignal(false);
    const onSubmit = async (e: Event) => {
        e.preventDefault();
        setSending(true);
        const response = await sendRequest({
            method: method(),
            url: url(),
            headers: {},
            body: "",
        });
        setSending(false);
        setResponse(response);
    };

    const disabled = createMemo(() => url().length === 0 || sending());
    return (
        <main class="w-full h-screen flex bg-base-300">
            <div class="w-52 flex flex-col bg-base-100 justify-start items-start p-2">
                <p class="text-semibold">History</p>
                <div class="divider"></div>
            </div>
            <div class="flex-1 w-full p-4 flex flex-col gap-4 h-full min-h-0">
                <form class="flex bg-base-100 justify-start items-center" onSubmit={onSubmit}>

                    <label class="input input-bordered w-full flex items-center gap-2">
                        <select value={method()} onChange={(e) => setMethod(e.currentTarget.value)} class="select font-semibold select-sm max-w-xs">
                            <option value="GET">GET</option>
                            <option value="HEAD">HEAD</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                            <option value="CONNECT">CONNECT</option>
                        </select>
                        <input autocapitalize="off" autocomplete="off" value={url()} onInput={(e) => setUrl(e.currentTarget.value)} type="text" class="grow" placeholder="Search" />
                        <button disabled={disabled()} class="btn btn-sm btn-primary" type="submit">Send</button>
                    </label>
                </form>


                <div class="flex rounded-md bg-base-100 p-4 flex-1 h-full min-h-0">
                    <div class="flex flex-col h-full">
                        <div class="flex gap-2 items-center justify-start">
                            <button>Params</button>
                            <button>Headers</button>
                            <button>Auth</button>
                            <button>Body</button>
                        </div>
                    </div>

                    <div class="divider divider-horizontal h-full m-0"></div>

                    <div class="flex flex-col flex-1 h-full min-h-0">
                        <Show when={response()} fallback={<p> Not Sent</p>}>
                            <div class="flex w-full gap-2 items-center justify-between">
                                <p>Response: {response()?.status}</p>
                                <div>
                                    <p class="text-sm"><span>{friendlySize(response()?.size_bytes!)}</span>, <span>{response()?.time_taken}ms</span></p>
                                </div>
                            </div>
                            <div class="divider m-0"></div>


                            <div class="flex-1 overflow-y-auto">
                                <Body res={response()!} />
                            </div>
                        </Show>

                    </div>

                </div>
            </div>
        </main >
    );
}

export default App;
