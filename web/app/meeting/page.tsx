"use client";

import {useEffect, useRef, useState} from "react";
import {consumeMeeting, type MeetingAccess} from "@/lib/meeting";

type JitsiApi = {
  addListener(event: string, callback: () => void): void;
  dispose(): void;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

export default function MeetingPage() {
  const container = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("Préparation de votre salle…");

  useEffect(() => {
    const access = consumeMeeting();
    if (!access) {
      window.location.replace("/");
      return;
    }

    let api: JitsiApi | undefined;
    let redirected = false;
    const leave = () => {
      if (redirected) return;
      redirected = true;
      window.location.replace(access.returnTo);
    };
    const start = () => {
      if (!container.current || !window.JitsiMeetExternalAPI) return;
      const domain = new URL(access.baseUrl).host;
      api = new window.JitsiMeetExternalAPI(domain, {
        roomName: access.roomName,
        parentNode: container.current,
        width: "100%",
        height: "100%",
        userInfo: {displayName: access.displayName},
        configOverwrite: {
          prejoinPageEnabled: false,
          prejoinConfig: {enabled: false},
          requireDisplayName: false,
          disableDeepLinking: true,
        },
      });
      api.addListener("videoConferenceJoined", () => setMessage(""));
      api.addListener("videoConferenceLeft", leave);
      api.addListener("readyToClose", leave);
    };

    if (window.JitsiMeetExternalAPI) start();
    else {
      const script = document.createElement("script");
      script.src = `${access.baseUrl}/external_api.js`;
      script.async = true;
      script.onload = start;
      script.onerror = () => setMessage("Impossible de charger la visioconférence.");
      document.head.appendChild(script);
    }
    return () => api?.dispose();
  }, []);

  return (
    <main style={{position:"fixed",inset:0,background:"#10111a"}}>
      {message && <p style={{position:"absolute",inset:0,display:"grid",placeItems:"center",color:"white",margin:0}}>{message}</p>}
      <div ref={container} style={{position:"absolute",inset:0}} aria-label="Réunion NexaLearn" />
    </main>
  );
}
