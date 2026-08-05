"use client";

import {Maximize2, Pause, Play, Volume2, VolumeX} from "lucide-react";
import {useEffect, useRef, useState, type KeyboardEvent} from "react";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  return `${minutes}:${String(rounded % 60).padStart(2, "0")}`;
}

export function AccessibleVideoPlayer({
  src,
  title,
  onError,
  onProgress,
}: {
  src: string;
  title: string;
  onError: () => void;
  onProgress: (seconds: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setPlaying(false);
      }
    } else {
      video.pause();
    }
  }

  function seek(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
    onProgress(Math.floor(value));
  }

  function changeVolume(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  async function toggleFullscreen() {
    if (!rootRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (typeof rootRef.current.requestFullscreen === "function") await rootRef.current.requestFullscreen();
    } catch {
      // Le plein écran peut être refusé sans interrompre la lecture.
    }
  }

  function keyboardControls(event: KeyboardEvent<HTMLVideoElement>) {
    const video = videoRef.current;
    if (!video) return;
    if (event.key === " " || event.key.toLowerCase() === "k") {
      event.preventDefault();
      void togglePlayback();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      seek(Math.max(0, video.currentTime - 5));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      seek(Math.min(duration || video.currentTime + 5, video.currentTime + 5));
    } else if (event.key.toLowerCase() === "m") {
      event.preventDefault();
      toggleMute();
    } else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      void toggleFullscreen();
    }
  }

  return (
    <div className="video-resource" ref={rootRef}>
      {buffering && <div className="media-loading" role="status">Chargement de la vidéo sécurisée…</div>}
      <video
        aria-label={`Vidéo : ${title}`}
        key={src}
        preload="metadata"
        ref={videoRef}
        src={src}
        tabIndex={0}
        onClick={() => void togglePlayback()}
        onKeyDown={keyboardControls}
        onLoadStart={() => setBuffering(true)}
        onLoadedMetadata={(event) => {
          setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
          setBuffering(false);
        }}
        onCanPlay={() => setBuffering(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => {setPlaying(true);setBuffering(false);}}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={onError}
        onTimeUpdate={(event) => {
          const seconds = event.currentTarget.currentTime;
          setCurrentTime(seconds);
          onProgress(Math.floor(seconds));
        }}
      >
        Votre navigateur ne prend pas en charge la lecture vidéo HTML5.
      </video>
      <div className="video-controls" aria-label="Commandes de la vidéo">
        <button className="video-control-button" type="button" aria-label={playing ? "Mettre en pause" : "Lire la vidéo"} onClick={() => void togglePlayback()}>
          {playing ? <Pause aria-hidden="true" size={19} /> : <Play aria-hidden="true" size={19} />}
        </button>
        <span className="video-time" aria-live="off">{formatTime(currentTime)} / {formatTime(duration)}</span>
        <label className="video-seek">
          <span className="sr-only">Position de lecture</span>
          <input
            aria-label="Position de lecture"
            type="range"
            min="0"
            max={Math.max(duration, 0)}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
          />
        </label>
        <button className="video-control-button" type="button" aria-label={muted ? "Activer le son" : "Couper le son"} onClick={toggleMute}>
          {muted ? <VolumeX aria-hidden="true" size={19} /> : <Volume2 aria-hidden="true" size={19} />}
        </button>
        <label className="video-volume">
          <span className="sr-only">Volume</span>
          <input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => changeVolume(Number(event.target.value))} />
        </label>
        <button className="video-control-button" type="button" aria-label={fullscreen ? "Quitter le plein écran" : "Afficher en plein écran"} onClick={() => void toggleFullscreen()}>
          <Maximize2 aria-hidden="true" size={18} />
        </button>
      </div>
    </div>
  );
}
