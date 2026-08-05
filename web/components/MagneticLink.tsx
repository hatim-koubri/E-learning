"use client";

import Link from "next/link";
import {useEffect, useRef, type ComponentProps, type PointerEvent} from "react";

export function MagneticLink({className = "", ...props}: ComponentProps<typeof Link>) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => () => {
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
  }, []);

  function move(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    const link = linkRef.current;
    if (!link) return;
    const rect = link.getBoundingClientRect();
    const x = Math.max(-3, Math.min(3, ((event.clientX - rect.left) / rect.width - .5) * 6));
    const y = Math.max(-3, Math.min(3, ((event.clientY - rect.top) / rect.height - .5) * 6));
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = requestAnimationFrame(() => {
      link.style.setProperty("--magnetic-x", `${x.toFixed(2)}px`);
      link.style.setProperty("--magnetic-y", `${y.toFixed(2)}px`);
    });
  }

  function reset() {
    const link = linkRef.current;
    if (!link) return;
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = requestAnimationFrame(() => {
      link.style.setProperty("--magnetic-x", "0px");
      link.style.setProperty("--magnetic-y", "0px");
    });
  }

  return <Link {...props} ref={linkRef} className={`magnetic-cta ${className}`.trim()} onPointerMove={move} onPointerLeave={reset} />;
}
