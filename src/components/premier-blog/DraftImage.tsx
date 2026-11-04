"use client";
import { useEffect, useState } from "react";
import { clientAuth } from "@/lib/firebase-client";
import { mediaPattern } from "@/lib/premier-blog/model";
export default function DraftImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    let objectUrl = "";
    setUrl("");
    setFailed(false);
    (async () => {
      if (!mediaPattern.test(src)) throw Error();
      const token = await clientAuth().currentUser?.getIdToken();
      if (!token) throw Error();
      const r = await fetch(src, {
        headers: { Authorization: "Bearer " + token },
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!r.ok) throw Error();
      const blob = await r.blob();
      if (!ctrl.signal.aborted) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    })().catch(() => {
      if (!ctrl.signal.aborted) setFailed(true);
    });
    return () => {
      ctrl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  return url ? (
    <img src={url} alt={alt} className={className} />
  ) : (
    <span>{failed ? "Image unavailable" : "Loading image…"}</span>
  );
}
