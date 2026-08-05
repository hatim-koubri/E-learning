import {render, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {MotionObserver} from "@/components/MotionObserver";

class RevealingIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
  disconnect = vi.fn();
  observe = vi.fn((target: Element) => target.classList.add("is-revealed"));
  takeRecords = () => [];
  unobserve = vi.fn();
}

describe("navigation vers Fonctionnement", () => {
  afterEach(() => {
    history.replaceState({}, "", "/");
    document.documentElement.className = "";
    vi.restoreAllMocks();
  });

  it("révèle et fait défiler la section ajoutée après un changement de route", async () => {
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: RevealingIntersectionObserver,
    });
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    history.replaceState({}, "", "/");
    const {unmount} = render(<MotionObserver />);

    const target = document.createElement("section");
    target.id = "fonctionnement";
    target.dataset.reveal = "";
    document.body.append(target);

    await waitFor(() => expect(target).toHaveClass("is-revealed"));
    history.replaceState({}, "", "/#fonctionnement");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(scrollIntoView).toHaveBeenCalledWith({behavior: "smooth", block: "start"});
    expect(document.documentElement).toHaveClass("motion-enhanced");
    unmount();
    target.remove();
  });

  it("respecte la préférence de mouvement réduit", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({matches: true}) as MediaQueryList),
    });
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    const target = document.createElement("section");
    target.id = "fonctionnement";
    target.dataset.reveal = "";
    document.body.append(target);
    history.replaceState({}, "", "/#fonctionnement");

    const {unmount} = render(<MotionObserver />);
    expect(scrollIntoView).toHaveBeenCalledWith({behavior: "auto", block: "start"});
    expect(document.documentElement).not.toHaveClass("motion-enhanced");
    unmount();
    target.remove();
    Object.defineProperty(window, "matchMedia", {configurable: true, value: originalMatchMedia});
  });
});
