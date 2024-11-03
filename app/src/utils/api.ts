import { invoke } from "@tauri-apps/api/core";
import { request as r } from "../utils/state";

export interface Request {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
}

export interface Response {
    status: number;
    body: string;
    headers: Record<string, string>;
    url: string;
    method: string;
    time_taken: number;
    body_size_bytes: number;
    headers_size_bytes: number;
}
export const sendRequest = async (request: Request) => {
    const newUrl = new URL(request.url);

    var mappedParams: Record<string, string> = {};
    r.params.forEach((param) => {
        if (!param.enabled) return;
        if (param.name === "") return;
        if (param.value === "") return;
        mappedParams[param.name] = param.value;
    });
    newUrl.search = new URLSearchParams(mappedParams).toString();
    request.url = newUrl.toString();
    const response = await invoke<Response>("send_request", {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
    });

    return response;
};
