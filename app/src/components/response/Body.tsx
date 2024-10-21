import { Component } from "solid-js";
import { Response } from "../utils/api";

interface BodyProps {
    res: Response;
}
const Body: Component<BodyProps> = (props) => {
    const contentType = props.res.headers["content-type"];
    console.log(contentType);

    const classes = "whitespace-pre-wrap text-sm";

    if (contentType?.includes("application/json")) {
        return <pre class={classes}>{JSON.stringify(JSON.parse(props.res.body), null, 2)}</pre>;
    }
    if (contentType?.includes("text/html")) {
        return <pre class={classes}>{props.res.body}</pre>;
    }
    if (contentType?.includes("text/plain")) {
        return <pre class={classes}>{props.res.body}</pre>;
    }
    if (contentType?.includes("application/xml")) {
        return <pre class={classes}>{props.res.body}</pre>;
    }
    if (contentType?.includes("image")) {
        return <img src={props.res.body} />;
    }

    return <pre class={classes}>{props.res.body}</pre>;
}

export default Body;
