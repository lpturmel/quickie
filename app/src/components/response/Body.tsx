import { Component, createEffect, createSignal } from "solid-js";
import { Response } from "../../utils/api";
import { codeToHtml } from "shiki";

interface BodyProps {
    res: Response;
}
const Body: Component<BodyProps> = (props) => {
    const [hydrated, setHydrated] = createSignal("");
    const contentType = props.res.headers["content-type"];
    const lang = () => {
        if (contentType?.includes("application/json")) {
            return "json"
        } else if (contentType?.includes("text/html")) {
            return "html"
        } else if (contentType?.includes("application/xml")) {
            return "xml"
        } else {
            return "plaintext"
        };
    }

    const body = () => props.res.body;

    createEffect(async () => {
        const html = await codeToHtml(body(), {
            lang: lang(), theme: "everforest-dark", colorReplacements: {
                "#2d353b": "transparent",
            }
        });
        setHydrated(html);

    });

    if (!contentType?.includes("image")) {
        return (
            <div class="code-container text-sm">
                <div innerHTML={hydrated()} />
            </div>
        )
    }
    return <img src={props.res.body} />;
}

export default Body;
