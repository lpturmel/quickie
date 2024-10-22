import { Component, createEffect, createMemo, createSignal, Show } from "solid-js";
import { Response } from "../../utils/api";
import { codeToHtml } from "shiki";

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
        } else if (contentType() === "text/plain") {
            return "plaintext"
        } else {
            return "image"
        }
    });

    // Data from the app backend is base64 encoded
    const body = createMemo(() => props.res.body);

    const imageUrl = createMemo(() => `data:${contentType()};base64,${body()}`);

    createEffect(async () => {
        console.log(contentType());
        console.log(body().length);
        console.log(lang());
        if (lang() == "image") return;
        const html = await codeToHtml(atob(body()), {
            lang: lang(), theme: "everforest-dark", colorReplacements: {
                "#2d353b": "transparent",
            }
        });
        setHydrated(html);

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
