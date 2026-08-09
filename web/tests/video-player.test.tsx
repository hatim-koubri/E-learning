import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {AccessibleVideoPlayer} from "@/components/AccessibleVideoPlayer";

describe("lecteur vidéo accessible", () => {
  it("conserve les commandes utilisables quand le plein écran est refusé", async () => {
    const onProgress = vi.fn();
    const user = userEvent.setup();
    const {container} = render(
      <AccessibleVideoPlayer src="https://media.test/cours.mp4" title="Cours pratique" onError={vi.fn()} onProgress={onProgress} />,
    );
    const root = container.querySelector(".video-resource") as HTMLDivElement;
    root.requestFullscreen = vi.fn().mockRejectedValue(new Error("Refus navigateur"));

    await user.click(screen.getByRole("button", {name: "Afficher en plein écran"}));
    await waitFor(() => expect(root.requestFullscreen).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", {name: "Lire la vidéo"})).toBeEnabled();

    const video = screen.getByLabelText("Vidéo : Cours pratique") as HTMLVideoElement;
    Object.defineProperty(video, "duration", {configurable: true, value: 120});
    fireEvent.loadedMetadata(video);
    fireEvent.change(screen.getByRole("slider", {name: "Position de lecture"}), {target: {value: "32"}});
    expect(onProgress).toHaveBeenLastCalledWith(32);
  });
});
