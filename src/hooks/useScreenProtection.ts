"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Best-effort shield against screenshots and screen recording in the browser.
 * OS-level capture cannot be fully blocked on the web; we obscure sensitive UI instead.
 */
export function useScreenProtection(active: boolean) {
  const [obscured, setObscured] = useState(false);

  const obscure = useCallback(() => setObscured(true), []);
  const clearObscured = useCallback(() => setObscured(false), []);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const onVisibilityChange = () => {
      if (document.hidden) obscure();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") obscure();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const isMacShot =
        event.metaKey &&
        event.shiftKey &&
        ["3", "4", "5"].includes(event.key);
      const isWinShot = event.key === "PrintScreen";
      if (isMacShot || isWinShot) obscure();
    };

    const onWindowBlur = () => obscure();

    const preventClipboard = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onWindowBlur);

    const mediaDevices = navigator.mediaDevices;
    let restoreGetDisplayMedia: (() => void) | undefined;

    if (mediaDevices?.getDisplayMedia) {
      const original = mediaDevices.getDisplayMedia.bind(mediaDevices);
      mediaDevices.getDisplayMedia = async function patchedGetDisplayMedia(
        ...args: Parameters<typeof mediaDevices.getDisplayMedia>
      ) {
        obscure();
        try {
          const stream = await original(...args);
          stream.getTracks().forEach((track) => {
            track.addEventListener("ended", clearObscured, { once: true });
          });
          return stream;
        } catch (error) {
          clearObscured();
          throw error;
        }
      };
      restoreGetDisplayMedia = () => {
        mediaDevices.getDisplayMedia = original;
      };
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onWindowBlur);
      restoreGetDisplayMedia?.();
      clearObscured();
    };
  }, [active, obscure, clearObscured]);

  return { obscured, clearObscured, obscure };
}
