"use client";

import {useEffect} from "react";

export function MotionObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const enhanced = !reduced && typeof window.IntersectionObserver === "function";
    let observer: IntersectionObserver | null = null;

    const scrollToHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      target.classList.add("is-revealed");
      observer?.unobserve(target);
      target.scrollIntoView({behavior: reduced ? "auto" : "smooth", block: "start"});
    };

    if (!enhanced) {
      scrollToHash();
      window.addEventListener("hashchange", scrollToHash);
      return () => window.removeEventListener("hashchange", scrollToHash);
    }

    root.classList.add("motion-enhanced");

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add("is-revealed");
        observer?.unobserve(entry.target);
      });
    }, {rootMargin: "0px 0px -8% 0px", threshold: 0.08});

    const register = (target: HTMLElement) => {
      observer?.observe(target);
    };
    const registerTree = (node: Node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches("[data-reveal]")) register(node);
      node.querySelectorAll<HTMLElement>("[data-reveal]").forEach(register);
    };
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach(register);
    scrollToHash();

    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach(registerTree));
    });
    mutations.observe(document.body, {childList: true, subtree: true});
    window.addEventListener("hashchange", scrollToHash);

    return () => {
      mutations.disconnect();
      observer?.disconnect();
      window.removeEventListener("hashchange", scrollToHash);
      root.classList.remove("motion-enhanced");
    };
  }, []);

  return null;
}
