# --- Build Stage (TypeScript compile) ---
FROM node:18-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json backend/knexfile.ts backend/update-types.ts ./
COPY backend/src ./src
COPY backend/migrations ./migrations

RUN npm run build

# --- Production Stage ---
FROM node:18-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Python runtime + native libs that opencv-python needs (libgl1, libglib2.0-0).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Isolated venv for pose extraction (sidesteps PEP 668 + keeps node + python deps separate).
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# CPU-only torch — ultralytics depends on it; the default CUDA wheel adds ~1 GB we don't need on a VPS.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch torchvision

# Pose-extraction Python deps (ultralytics, opencv-python).
COPY tools/requirements.txt /tmp/tools-requirements.txt
RUN pip install --no-cache-dir -r /tmp/tools-requirements.txt && rm /tmp/tools-requirements.txt

# Bake the YOLO pose weights into the image so the first upload doesn't pay the download cost.
# Lands in /app (cwd) where ultralytics looks first when given a bare filename.
RUN python -c "from ultralytics import YOLO; YOLO('yolov8m-pose.pt')"

# Node production deps.
COPY backend/package*.json ./
RUN npm ci --only=production

# Built backend.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist/migrations ./migrations
COPY --from=builder /app/dist/knexfile.js ./knexfile.js
COPY --from=builder /app/src/jobs/seed.sql ./dist/src/jobs/seed.sql

# Pose script — danceMoveService.ts resolves it as ../../../tools/extract_pose.py from dist/src/services.
COPY tools ./tools

# Entrypoint.
COPY backend/docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

EXPOSE 3003

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/index.js"]
