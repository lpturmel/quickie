import { createStore } from "solid-js/store";
import { createSignal } from "solid-js";
import { type HighlighterCore, createHighlighterCore } from "shiki/core";
import everforest from "shiki/themes/everforest-dark.mjs";
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'

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

export const [hi, setHi] = createSignal<HighlighterCore | null>(null);

export async function initHighlighter() {
    const highlighter = await createHighlighterCore({
        themes: [
            everforest,
        ],
        langs: [
            import('shiki/langs/javascript.mjs'),
            import('shiki/langs/json.mjs'),
            import('shiki/langs/html.mjs'),
            import('shiki/langs/xml.mjs'),
            import('shiki/langs/css.mjs'),
        ],
        engine: createOnigurumaEngine(import('shiki/wasm'))
    })
    setHi(highlighter);
}
