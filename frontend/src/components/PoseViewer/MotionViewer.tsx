import React, { useState } from "react";
import { PoseViewer } from "./PoseViewer";
import styles from "./MotionViewer.module.scss";

interface MotionViewerProps {
  poseData: string | null;
  youtubeUrl: string | null;
}

type Tab = "animation" | "video";

/** Pulls the video ID out of a YouTube URL (covers watch, youtu.be, embed, shorts). */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Reads the start time from a YouTube URL and returns it in seconds.
 * Handles ?t=21 and ?t=1m30s formats
 */
function extractStartTime(url: string): number | null {
  const match = url.match(/[?&](?:t|start)=([^&]+)/);
  if (!match) return null;

  const raw = match[1];
  // Plain seconds, e.g. "21" or "21s".
  if (/^\d+s?$/.test(raw)) {
    return parseInt(raw, 10);
  }
  // Compound form like 1h2m30s.
  const hoursMatch = raw.match(/(\d+)h/);
  const minutesMatch = raw.match(/(\d+)m/);
  const secondsMatch = raw.match(/(\d+)s/);
  if (hoursMatch || minutesMatch || secondsMatch) {
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

export const MotionViewer: React.FC<MotionViewerProps> = ({
  poseData,
  youtubeUrl,
}) => {
  const hasAnimation = !!poseData;
  const hasVideo = !!youtubeUrl && !!extractYouTubeId(youtubeUrl);

  const [tab, setTab] = useState<Tab>(hasAnimation ? "animation" : "video");

  if (!hasAnimation && !hasVideo) {
    return null;
  }

  const videoId = hasVideo ? extractYouTubeId(youtubeUrl!) : null;
  const startTime = hasVideo ? extractStartTime(youtubeUrl!) : null;
  const embedSrc = videoId
    ? `https://www.youtube.com/embed/${videoId}${startTime ? `?start=${startTime}` : ""}`
    : "";

  return (
    <div className={styles.wrapper}>
      {hasAnimation && hasVideo && (
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "animation" ? styles.active : ""}`}
            onClick={() => setTab("animation")}
          >
            3D Animation
          </button>
          <button
            className={`${styles.tab} ${tab === "video" ? styles.active : ""}`}
            onClick={() => setTab("video")}
          >
            Video
          </button>
        </div>
      )}

      {tab === "animation" && hasAnimation && (
        <PoseViewer poseData={poseData!} />
      )}

      {tab === "video" && hasVideo && (
        <div className={styles.youtubeContainer}>
          <iframe
            src={embedSrc}
            title="Dance move video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};
