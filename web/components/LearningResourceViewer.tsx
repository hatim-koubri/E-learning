"use client";

import Image from "next/image";
import {CircleAlert, ExternalLink, FileImage, LoaderCircle, Youtube} from "lucide-react";
import {useState} from "react";
import {AccessibleVideoPlayer} from "@/components/AccessibleVideoPlayer";
import {PdfReader} from "@/components/PdfReader";
import {Alert, ErrorState} from "@/components/ui";
import type {ResourceAccess} from "@/lib/learning";
import {parseYouTubeUrl} from "@/lib/youtube";

export function YoutubeResourceCard({url, title}: {url: string; title: string}) {
  const youtube = parseYouTubeUrl(url);
  if (!youtube) {
    return <ErrorState title="Lien YouTube invalide" message="Cette ressource ne contient pas une URL YouTube HTTPS reconnue." />;
  }
  return (
    <article className="youtube-resource">
      <div className="youtube-thumbnail">
        <Image unoptimized fill loading="eager" sizes="(max-width: 700px) 100vw, 720px" src={youtube.thumbnailUrl} alt="" />
        <span><Youtube aria-hidden="true" size={28} /></span>
      </div>
      <div className="youtube-copy">
        <span className="resource-kicker"><Youtube size={17} /> Lien YouTube vérifié</span>
        <h2>{title}</h2>
        <p>La vidéo s’ouvre directement sur YouTube. Aucun lecteur tiers n’est injecté dans votre espace d’apprentissage.</p>
        <a className="btn btn-primary" href={youtube.watchUrl} target="_blank" rel="noopener noreferrer">
          <Youtube size={18} /> Regarder sur YouTube <ExternalLink size={16} />
        </a>
      </div>
    </article>
  );
}

export function LearningResourceViewer({
  access,
  title,
  onRetry,
  onVideoProgress,
}: {
  access: ResourceAccess;
  title: string;
  onRetry: () => void;
  onVideoProgress: (seconds: number) => void;
}) {
  const [mediaLoading, setMediaLoading] = useState(access.type === "IMAGE");
  const [mediaError, setMediaError] = useState(false);

  if (access.type === "PDF") return <PdfReader url={access.url} title={title} onRetry={onRetry} />;
  if (access.type === "YOUTUBE") return <YoutubeResourceCard url={access.url} title={title} />;

  if (mediaError) {
    return (
      <div className="resource-media-error">
        <CircleAlert size={32} />
        <ErrorState
          title="Ressource indisponible"
          message="Le média n’a pas pu être chargé. Le lien temporaire a peut-être expiré."
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (access.type === "VIDEO") {
    return <AccessibleVideoPlayer src={access.url} title={title} onError={() => setMediaError(true)} onProgress={onVideoProgress} />;
  }

  return (
    <div className="image-resource">
      {mediaLoading && <Alert><LoaderCircle className="spin" size={18} /> Chargement de l’image…</Alert>}
      <Image
        unoptimized
        width={1600}
        height={1000}
        src={access.url}
        alt={title}
        onLoad={() => setMediaLoading(false)}
        onError={() => {setMediaLoading(false);setMediaError(true);}}
      />
      <span className="resource-kicker"><FileImage size={16} /> Image pédagogique</span>
    </div>
  );
}
