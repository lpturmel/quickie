import { Component, createSignal, Show } from "solid-js";
import Params from "./Params";
import Headers from "./Headers";

const Request: Component = () => {
    const [selectedTab, setSelectedTab] = createSignal("params");

    const changeTab = (tab: string) => {
        setSelectedTab(tab);
    };

    const buttonClasses = "tab font-semibold ";
    return (
        <div class="flex flex-col h-full">
            <div class="border-b-[0.5px] border-base-content/20 p-2">
                <div class="tabs tabs-boxed bg-base-100 flex gap-2 items-center justify-start">
                    <button class={buttonClasses + (selectedTab() === "params" ? " tab-active" : "")} onClick={() => changeTab("params")}>Params</button>
                    <button class={buttonClasses + (selectedTab() === "headers" ? " tab-active" : "")} onClick={() => changeTab("headers")}>Headers</button>
                    <button class={buttonClasses + (selectedTab() === "auth" ? " tab-active" : "")} onClick={() => changeTab("auth")}>Auth</button>
                    <button class={buttonClasses + (selectedTab() === "body" ? " tab-active" : "")} onClick={() => changeTab("body")}>Body</button>
                </div>
            </div>

            <Show when={selectedTab() === "params"}>
                <Params />
            </Show>
            <Show when={selectedTab() === "headers"}>
                <Headers />
            </Show>
        </div>
    );
}
export default Request;

