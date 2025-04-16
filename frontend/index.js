import { createApp } from "https://unpkg.com/obsydianjs@latest";
import App from "./app.js";

const app = createApp(App, {}, {});

app.mount(document.getElementById("app"));
