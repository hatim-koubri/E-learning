import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import MeetingPage from "@/app/meeting/page";
import {consumeMeeting} from "@/lib/meeting";

vi.mock("@/lib/meeting", () => ({consumeMeeting: vi.fn()}));

const consume = vi.mocked(consumeMeeting);
const access = {
  baseUrl: "https://meet.example.test",
  roomName: "classe-java-4",
  displayName: "Nora",
  moderator: false,
  returnTo: "/participant/classes",
};

describe("salle de visioconférence", () => {
  beforeEach(() => {
    consume.mockReturnValue(access);
    delete window.JitsiMeetExternalAPI;
    document.head.querySelectorAll('script[src="https://meet.example.test/external_api.js"]').forEach((script) => script.remove());
  });

  afterEach(() => {
    delete window.JitsiMeetExternalAPI;
  });

  it("charge l'API Jitsi puis affiche et libère la réunion", async () => {
    const listeners = new Map<string, () => void>();
    const dispose = vi.fn();
    const constructor = vi.fn(function (_domain: string, _options: Record<string, unknown>) {
      return {addListener: (event: string, callback: () => void) => listeners.set(event, callback), dispose};
    });
    const {unmount} = render(<MeetingPage />);
    const script = document.head.querySelector('script[src="https://meet.example.test/external_api.js"]') as HTMLScriptElement;
    expect(script).toBeInTheDocument();
    window.JitsiMeetExternalAPI = constructor as typeof window.JitsiMeetExternalAPI;
    fireEvent.load(script);
    expect(constructor).toHaveBeenCalledWith("meet.example.test", expect.objectContaining({
      roomName: "classe-java-4",
      userInfo: {displayName: "Nora"},
    }));
    listeners.get("videoConferenceJoined")?.();
    await waitFor(() => expect(screen.queryByText("Préparation de votre salle…")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Réunion Khotwa")).toBeInTheDocument();
    unmount();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("affiche une erreur lorsque le script Jitsi ne charge pas", () => {
    render(<MeetingPage />);
    const script = document.head.querySelector('script[src="https://meet.example.test/external_api.js"]') as HTMLScriptElement;
    fireEvent.error(script);
    expect(screen.getByText("Impossible de charger la visioconférence.")).toBeInTheDocument();
  });
});
