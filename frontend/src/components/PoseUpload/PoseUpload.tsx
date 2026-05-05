import React, { useState, useRef } from "react";
import { uploadPoseVideo, deletePoseData } from "../../api/danceMoveApi";
import { DanceMove, PoseStatusEnum } from "../../types";
import styles from "./PoseUpload.module.scss";

interface PoseUploadProps {
  moveId: number;
  currentFileName: string | null;
  poseStatus: PoseStatusEnum | null;
  poseError: string | null;
  onUploadComplete: (updatedMove: DanceMove) => void;
}

export const PoseUpload: React.FC<PoseUploadProps> = ({
  moveId,
  currentFileName,
  poseStatus,
  poseError,
  onUploadComplete,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [numPoses, setNumPoses] = useState(2);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = poseStatus === PoseStatusEnum.Processing || poseStatus === PoseStatusEnum.Queued;

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    setError("");

    try {
      const updated = await uploadPoseVideo(moveId, file, numPoses);
      onUploadComplete(updated);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start extraction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const updated = await deletePoseData(moveId);
      onUploadComplete(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to remove pose data");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.uploadSection}>
      <span className={styles.label}>Motion Capture</span>

      {poseStatus === PoseStatusEnum.Queued && (
        <div className={styles.status}>
          Queued — another extraction is running. You can leave this page; the
          job will start automatically.
        </div>
      )}

      {poseStatus === PoseStatusEnum.Processing && (
        <div className={styles.status}>
          Processing video in the background. You can leave this page — the
          extraction will continue and appear on the move detail when ready.
        </div>
      )}

      {poseStatus === PoseStatusEnum.Failed && (
        <div className={styles.error}>
          Previous extraction failed: {poseError || "unknown error"}
        </div>
      )}

      {currentFileName && !isProcessing && (
        <div className={styles.fileInfo}>
          <span className={styles.fileName}>Source: {currentFileName}</span>
          <button
            className={styles.removeButton}
            onClick={handleRemove}
            disabled={isSubmitting}
          >
            Remove
          </button>
        </div>
      )}

      <div className={styles.uploadRow}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mov,.avi,.webm,.mkv"
          className={styles.fileInput}
          disabled={isSubmitting || isProcessing}
        />
        <select
          value={numPoses}
          onChange={(e) => setNumPoses(parseInt(e.target.value))}
          className={styles.numPosesSelect}
          disabled={isSubmitting || isProcessing}
        >
          <option value={1}>1 person</option>
          <option value={2}>2 people</option>
        </select>
        <button
          className={styles.uploadButton}
          onClick={handleUpload}
          disabled={isSubmitting || isProcessing}
        >
          {isSubmitting ? "Starting..." : isProcessing ? "Processing..." : "Extract Motion"}
        </button>
      </div>

      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
};
