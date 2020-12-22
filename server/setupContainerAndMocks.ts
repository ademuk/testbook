import { Mock, setupMocks } from "./mocks";
import { Logger } from "./logger";

declare global {
  interface Window {
    container: HTMLElement;
    mocks: Mock[];
    console: Logger;
  }
}

const container = document.createElement("div");

document.body.appendChild(container);

window.container = container;
window.mocks = setupMocks();
