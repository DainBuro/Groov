"""
Extract pose landmark data from a dance video using YOLOv8-Pose.

Uses YOLO's built-in BoT-SORT tracker for consistent person IDs across frames,
and estimates depth (z) from body proportions for pseudo-3D visualization.

Usage:
    python extract_pose.py path/to/video.mp4 -o pose_data.json
    python extract_pose.py path/to/video.mp4 --num-poses 2 -o pose_data.json

Install dependencies:
    pip install -r requirements.txt
"""

import argparse
import json
import sys

import cv2
import numpy as np
from ultralytics import YOLO


# YOLOv8-Pose keypoint indices
# 0:nose 1:left_eye 2:right_eye 3:left_ear 4:right_ear
# 5:left_shoulder 6:right_shoulder 7:left_elbow 8:right_elbow
# 9:left_wrist 10:right_wrist 11:left_hip 12:right_hip
# 13:left_knee 14:right_knee 15:left_ankle 16:right_ankle

SHOULDER_L, SHOULDER_R = 5, 6
HIP_L, HIP_R = 11, 12

# Reference torso height (shoulder-to-hip) in normalized coords when person is
# at "neutral" depth. Calibrated roughly for a full-body shot.
REFERENCE_TORSO = 0.25


def estimate_depth(landmarks, frame_w, frame_h):
    """
    Estimate per-keypoint depth from body proportions.

    Uses torso size (shoulder-to-hip distance) as a proxy for distance from camera.
    Larger torso = closer = negative z (towards camera).
    Also uses horizontal position for slight lateral depth.
    """
    ls = landmarks[SHOULDER_L]
    rs = landmarks[SHOULDER_R]
    lh = landmarks[HIP_L]
    rh = landmarks[HIP_R]

    # Torso midpoints
    shoulder_mid_y = (ls["y"] + rs["y"]) / 2
    hip_mid_y = (lh["y"] + rh["y"]) / 2
    torso_height = abs(hip_mid_y - shoulder_mid_y)

    # Depth from torso size: larger = closer (more negative z)
    if torso_height > 0.01:
        depth_from_size = (REFERENCE_TORSO - torso_height) * 2.0
    else:
        depth_from_size = 0.0

    body_center_x = (ls["x"] + rs["x"] + lh["x"] + rh["x"]) / 4

    for lm in landmarks:
        z = depth_from_size
        offset_x = lm["x"] - body_center_x
        z += offset_x * 0.15
        lm["z"] = round(z, 6)

    return landmarks


def extract_pose(video_path: str, num_poses: int = 1, model_size: str = "x") -> dict:
    """Extract pose landmarks from a video file using YOLOv8-Pose with tracking."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video file: {video_path}", file=sys.stderr)
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"Video: {video_path}")
    print(f"FPS: {fps}, Total frames: {total_frames}, Resolution: {frame_w}x{frame_h}")

    model_name = f"yolov8{model_size}-pose.pt"
    print(f"Loading model: {model_name}")
    model = YOLO(model_name)

    frames = []
    frame_count = 0
    skipped_slots = 0

    # Tracking state
    track_to_slot = {}
    slot_to_track = {}
    slot_last_seen = {}
    previous_frame = None
    STALE_THRESHOLD = 3

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        results = model.track(frame, persist=True, verbose=False)[0]

        detected = {}
        unassigned = []

        if results.keypoints is not None and len(results.keypoints) > 0:
            keypoints = results.keypoints
            track_ids = []

            if results.boxes.id is not None:
                track_ids = results.boxes.id.cpu().numpy().astype(int).tolist()
            else:
                track_ids = list(range(len(keypoints)))

            for i, track_id in enumerate(track_ids):
                kps = keypoints[i]
                xy = kps.xy.cpu().numpy()[0]  # (17, 2)

                landmarks = []
                for j in range(17):
                    landmarks.append({
                        "x": round(float(xy[j][0]) / frame_w, 6),
                        "y": round(float(xy[j][1]) / frame_h, 6),
                        "z": 0.0,
                    })
                landmarks = estimate_depth(landmarks, frame_w, frame_h)

                if track_id not in track_to_slot:
                    assigned = False
                    used_slots = set(track_to_slot.values())
                    for s in range(num_poses):
                        if s not in used_slots:
                            track_to_slot[track_id] = s
                            slot_to_track[s] = track_id
                            assigned = True
                            break
                    if not assigned:
                        stalest_slot = None
                        stalest_age = -1
                        for s in range(num_poses):
                            age = frame_count - slot_last_seen.get(s, 0)
                            if age >= STALE_THRESHOLD and age > stalest_age:
                                stalest_age = age
                                stalest_slot = s
                        if stalest_slot is not None:
                            old_track = slot_to_track.get(stalest_slot)
                            if old_track is not None and old_track in track_to_slot:
                                del track_to_slot[old_track]
                            track_to_slot[track_id] = stalest_slot
                            slot_to_track[stalest_slot] = track_id
                            assigned = True
                    if not assigned:
                        unassigned.append(landmarks)
                        continue

                slot = track_to_slot[track_id]
                if slot >= num_poses:
                    unassigned.append(landmarks)
                    continue

                slot_last_seen[slot] = frame_count
                detected[slot] = landmarks

            # Fill empty slots with unassigned detections (closest match)
            empty_slots = [s for s in range(num_poses) if s not in detected]
            if unassigned and empty_slots and previous_frame:
                for slot in empty_slots:
                    if not unassigned:
                        break
                    prev_pose = previous_frame[slot] if slot < len(previous_frame) else None
                    if prev_pose:
                        prev_cx = sum(lm["x"] for lm in prev_pose) / len(prev_pose)
                        prev_cy = sum(lm["y"] for lm in prev_pose) / len(prev_pose)
                        best_idx = 0
                        best_dist = float("inf")
                        for ui, ulm in enumerate(unassigned):
                            cx = sum(lm["x"] for lm in ulm) / len(ulm)
                            cy = sum(lm["y"] for lm in ulm) / len(ulm)
                            dist = ((cx - prev_cx) ** 2 + (cy - prev_cy) ** 2) ** 0.5
                            if dist < best_dist:
                                best_dist = dist
                                best_idx = ui
                        detected[slot] = unassigned.pop(best_idx)
                        slot_last_seen[slot] = frame_count
                    else:
                        detected[slot] = unassigned.pop(0)
                        slot_last_seen[slot] = frame_count

        # Build frame with all slots
        frame_data = []
        for slot in range(num_poses):
            if slot in detected:
                frame_data.append(detected[slot])
            elif previous_frame and slot < len(previous_frame):
                frame_data.append(previous_frame[slot])
            else:
                frame_data.append([{"x": 0, "y": 0, "z": 0.0} for _ in range(17)])
                skipped_slots += 1

        previous_frame = frame_data
        frames.append(frame_data)

        if frame_count % 100 == 0:
            print(f"  Processed {frame_count}/{total_frames} frames...")

    cap.release()

    print(f"Done. Extracted {len(frames)} frames ({skipped_slots} empty pose slots).")

    return {
        "fps": round(fps, 2),
        "num_poses": num_poses,
        "frames": frames,
    }


def main():
    parser = argparse.ArgumentParser(description="Extract pose data from a dance video using YOLOv8-Pose")
    parser.add_argument("video", help="Path to the input video file")
    parser.add_argument("-o", "--output", default="pose_data.json", help="Output JSON file path")
    parser.add_argument("--num-poses", type=int, default=1,
                        help="Number of poses to track (default: 1, use 2 for partner dances)")
    parser.add_argument("--model", default="x", choices=["n", "s", "m", "l", "x"],
                        help="Model size: n=nano, s=small, m=medium, l=large, x=extra-large (default: x)")
    args = parser.parse_args()

    pose_data = extract_pose(args.video, num_poses=args.num_poses, model_size=args.model)

    with open(args.output, "w") as f:
        json.dump(pose_data, f)

    file_size_kb = len(json.dumps(pose_data)) / 1024
    print(f"Saved to {args.output} ({file_size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
