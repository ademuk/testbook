import {Mock, setupMocks} from "./mocks";

declare global {
  interface Window {
    container: HTMLElement;
    mocks: Mock[];
  }
}

const container = document.createElement('div');

document.body.appendChild(container);

window.container = container;
window.mocks = setupMocks();
