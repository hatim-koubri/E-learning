import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: {
    default: "NexaLearn — Formations et classes virtuelles",
    template: "%s | NexaLearn",
  },
  description: "Plateforme E-learning pour apprendre, progresser et participer à des classes virtuelles.",
};

const themeScript = `
  try {
    const saved = localStorage.getItem("theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = saved || preferred;
  } catch (_) {}
`;

export default function RootLayout({children}:{children:React.ReactNode}) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html: themeScript}} /></head>
      <body>
        <a className="skip-link" href="#contenu-principal">Aller au contenu principal</a>
        {children}
      </body>
    </html>
  );
}
