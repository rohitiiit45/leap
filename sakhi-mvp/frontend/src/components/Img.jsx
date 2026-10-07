import { useState } from "react";
// Photo with an emoji tile fallback if the image fails to load
export default function Img({ src, alt = "", emoji = "🪔", className = "" }) {
  const [bad, setBad] = useState(false);
  return bad || !src
    ? <div role="img" aria-label={alt} className={`grid place-items-center bg-sakhi-50 text-6xl ${className}`}>{emoji}</div>
    : <img src={src} alt={alt} loading="lazy" onError={() => setBad(true)} className={`object-cover ${className}`} />;
}
