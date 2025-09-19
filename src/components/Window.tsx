import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import InertiaPlugin from "gsap/InertiaPlugin";
import { createEffect } from "solid-js";

export function Window({ children }: { children?: any }) {
  let windowRef: HTMLElement | undefined;
  let titleBarRef: HTMLElement | undefined;

  createEffect(() => {
    gsap.registerPlugin(Draggable, InertiaPlugin);

    if (windowRef && titleBarRef) {
      Draggable.create(windowRef, {
        bounds: window,
        inertia: true,
        trigger: titleBarRef,
      });
    }
  });

  return (
    <main ref={windowRef} class="window">
      <header ref={titleBarRef} class="window-titlebar">
        <div class="window-title">Tastebuds</div>
        <div class="window-controls">
          <button class="window-control minimize">-</button>
          <button class="window-control maximize">+</button>
          <button class="window-control close">x</button>
        </div>
      </header>
      <div class="window-content">{children}</div>
    </main>
  );
}
