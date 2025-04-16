import { createApp } from '../../framework/src/index.js';
import App from './app.js';

const app = createApp(App, {}, {});

app.mount(document.getElementById('app'));