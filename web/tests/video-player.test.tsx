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
  it("pilote lecture, volume, clavier et fin de média", async () => {
    const onProgress = vi.fn();
    const onEnded = vi.fn();
    const onError = vi.fn();
    const user = userEvent.setup();
    render(<AccessibleVideoPlayer src="https://media.test/cours.mp4" title="Cours" onError={onError} onProgress={onProgress} onEnded={onEnded} />);
    const video = screen.getByLabelText("Vidéo : Cours") as HTMLVideoElement;
    Object.defineProperties(video, {
      duration: {configurable: true, value: 125},
      paused: {configurable: true, value: true},
      play: {configurable: true, value: vi.fn().mockResolvedValue(undefined)},
      pause: {configurable: true, value: vi.fn()},
    });
    fireEvent.loadedMetadata(video);
    expect(screen.getByText("0:00 / 2:05")).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Lire la vidéo"}));
    expect(video.play).toHaveBeenCalledOnce();
    fireEvent.playing(video);
    expect(screen.getByRole("button", {name: "Mettre en pause"})).toBeInTheDocument();
    fireEvent.timeUpdate(video, {target: {currentTime: 37}});
    expect(onProgress).toHaveBeenCalledWith(37);
    fireEvent.keyDown(video, {key: "ArrowRight"});
    expect(onProgress).toHaveBeenLastCalledWith(42);
    fireEvent.keyDown(video, {key: "ArrowLeft"});
    expect(onProgress).toHaveBeenLastCalledWith(37);
    await user.click(screen.getByRole("button", {name: "Couper le son"}));
    expect(video.muted).toBe(true);
    fireEvent.change(screen.getByRole("slider", {name: "Volume"}), {target: {value: "0.4"}});
    expect(video.volume).toBe(0.4);
    fireEvent.ended(video);
    expect(onEnded).toHaveBeenCalledOnce();
    fireEvent.error(video);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("charge, met en tampon et quitte le plein écran", async () => {
    const user = userEvent.setup();
    const {container} = render(<AccessibleVideoPlayer src="https://media.test/cours.mp4" title="Cours" onError={vi.fn()} onProgress={vi.fn()} />);
    const video = screen.getByLabelText("Vidéo : Cours");
    fireEvent.canPlay(video);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.waiting(video);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement");
    const root = container.querySelector(".video-resource") as HTMLDivElement;
    root.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    await user.click(screen.getByRole("button", {name: "Afficher en plein écran"}));
    Object.defineProperty(document, "fullscreenElement", {configurable: true, value: root});
    fireEvent(document, new Event("fullscreenchange"));
    const exit = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "exitFullscreen", {configurable: true, value: exit});
    await user.click(await screen.findByRole("button", {name: "Quitter le plein écran"}));
    expect(exit).toHaveBeenCalledOnce();
  });
});
