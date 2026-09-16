// ─── Face Detection & Landmark Metrics Web Worker ──────────────────────────────
// Offloads heavy geometry calculations, face expression metrics, and tracking states.

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "COMPUTE_FACE_METRICS") {
    const { positions, width, height, timeMs } = payload;
    if (!positions || positions.length < 68) {
      self.postMessage({ type: "FACE_METRICS_RESULT", success: false });
      return;
    }

    const leftEye = positions[36];
    const rightEye = positions[45];
    const nose = positions[30];
    const chin = positions[8];
    const topBrow = positions[19];

    const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    const faceW = eyeDistance * 2.2;
    const faceH = Math.hypot(chin.x - topBrow.x, chin.y - topBrow.y) * 1.3;

    // Mouth dimensions
    const topLip = positions[51];
    const bottomLip = positions[57];
    const leftMouth = positions[48];
    const rightMouth = positions[54];

    const mouthHeight = Math.hypot(bottomLip.x - topLip.x, bottomLip.y - topLip.y);
    const mouthWidth = Math.hypot(rightMouth.x - leftMouth.x, rightMouth.y - leftMouth.y);

    const mouthOpen = mouthHeight > mouthWidth * 0.38;
    const smiling = mouthWidth > eyeDistance * 0.95 && mouthHeight < mouthWidth * 0.45;

    self.postMessage({
      type: "FACE_METRICS_RESULT",
      success: true,
      metrics: {
        cx: nose.x,
        cy: nose.y,
        faceW,
        faceH,
        mouthOpen,
        smiling,
        eyeDistance,
        width,
        height,
        timeMs,
      },
    });
  }
};
