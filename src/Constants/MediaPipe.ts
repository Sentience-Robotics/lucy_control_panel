import type { Options } from "@mediapipe/hands";

export const MEDIAPIPE_HANDS_URL: string = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/';

export const HANDS_MODEL_CONFIG: Options = {
    maxNumHands: 2,
    modelComplexity: 1,
    selfieMode: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
}
