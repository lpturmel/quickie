import { invoke } from "@tauri-apps/api/core";

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
    const response = await invoke<Response>("send_request", {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
    });

    return response;
};
