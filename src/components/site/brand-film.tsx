"use client";

import { useState } from "react";

const films = {
  presentation: {
    file: "egd-apresentacao", poster: "apresentacao-poster", captions: "apresentacao",
    label: "Apresentação EGD: tecnologia que conecta projeto e operação",
    caption: "EGD em 15 segundos · Filme sem áudio",
    transcript: "EGD Consultoria em Tecnologia. Entre o desafio e a próxima entrega. Entender o contexto. Conectar dados, sistemas e pessoas. Entregar tecnologia para a operação. Vamos construir juntos. egdsystem.com.br.",
  },
  signature: {
    file: "egd-assinatura", poster: "assinatura-poster", captions: "assinatura",
    label: "Assinatura EGD: do projeto à operação",
    caption: "Do projeto à operação · 8 segundos · Filme sem áudio",
    transcript: "Do projeto à operação. EGD Consultoria em Tecnologia. egdsystem.com.br.",
  },
} as const;

export function BrandFilm({ variant = "presentation" }: { variant?: keyof typeof films }) {
  const [failed, setFailed] = useState(false);
  const film = films[variant];
  return <figure className="brand-film">
    <video key={variant} controls playsInline preload="none" poster={`/brand/video/${film.poster}.webp`} aria-label={film.label} onLoadedData={() => setFailed(false)} onError={() => setFailed(true)}>
      <source src={`/brand/video/${film.file}.webm`} type="video/webm" />
      <track kind="captions" src={`/brand/video/${film.captions}.vtt`} srcLang="pt-BR" label="Português" default />
      Seu navegador não suporta este vídeo. A transcrição está logo abaixo.
    </video>
    {failed && <p role="status">Não foi possível reproduzir o vídeo. Leia a transcrição abaixo.</p>}
    <figcaption>{film.caption}</figcaption>
    <details><summary>Ler transcrição do vídeo</summary><p>{film.transcript}</p></details>
  </figure>;
}
