import { Component, createEffect, createMemo, createSignal, Show } from "solid-js";
import { Response } from "../../utils/api";
import { hi } from "../../utils/state";

interface BodyProps {
    res: Response;
}


const Body: Component<BodyProps> = (props) => {
    const [hydrated, setHydrated] = createSignal("");
    const contentType = createMemo(() => props.res.headers["content-type"] || "text/plain");
    const lang = createMemo(() => {
        if (contentType().includes("application/json")) {
            return "json"
        } else if (contentType().includes("text/html")) {
            return "html"
        } else if (contentType().includes("application/xml")) {
            return "xml"
        } else if (contentType().includes("text/css")) {
            return "css"
        } else if (contentType().includes("text/javascript")) {
            return "javascript"
        }
        else if (contentType().startsWith("image/")) {
            return "image"
        } else {
            return "text"
        }
    });

    const body = createMemo(() => props.res.body);

    const imageUrl = createMemo(() => `data:${contentType()};base64,${body()}`);

    createEffect(async () => {
        if (lang() == "image") return;
        const html = hi()?.codeToHtml(atob(body()), {
            lang: lang(), theme: "everforest-dark", colorReplacements: {
                "#2d353b": "transparent",
            }
        });
        if (html) setHydrated(html);

    });

    return (
        <>
            <Show when={contentType().startsWith("image/")}>
                <img src={imageUrl()} alt="Response Image" />
            </Show>
            <Show when={!contentType().startsWith("image/")}>
                <div class="code-container text-sm">
                    <div innerHTML={hydrated()} />
                </div>
            </Show>
        </>
    )
}

export default Body;
