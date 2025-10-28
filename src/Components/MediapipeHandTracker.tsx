import { HAND_CONNECTIONS, Hands, type Results } from "@mediapipe/hands";
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

interface MediapipeHandTrackerProps {
    width?: number;
    height?: number;
    moveRobotIndex?: (x: number) => void;
}

const MediapipeHandTracker: React.FC<MediapipeHandTrackerProps> = ({
    width,
    height,
    moveRobotIndex
}) => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [indexTip, setIndexTip] = useState<{ x: number; y: number } | null>(null);

    const onResults = (results: Results) => {
        if (!webcamRef.current?.video || !canvasRef.current) return;

        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, videoWidth, videoHeight);
        ctx.drawImage(results.image, 0, 0, videoWidth, videoHeight);

        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                    color: "#00FF00",
                    lineWidth: 4,
                });
                drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 2 });
                //TODO Temporary poc, move index from top to bottom
                // Get the index fingertip (landmark #8)
                const indexTipLandmark = landmarks[8];
                if (indexTipLandmark) {
                    const x = indexTipLandmark.x * videoWidth;
                    const y = indexTipLandmark.y * videoHeight;

                    setIndexTip({ x, y });
                    moveRobotIndex?.(y);

                    ctx.beginPath();
                    ctx.arc(x, y, 8, 0, 2 * Math.PI);
                    ctx.fillStyle = "cyan";
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    };

    useEffect(() => {
        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            selfieMode: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,

        });
        hands.onResults(onResults);

        const initCamera = () => {
            if (!webcamRef.current?.video) return;
            const camera = new Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (!webcamRef.current?.video) return;
                    await hands.send({ image: webcamRef.current.video });
                },
                width,
                height,
            });
            camera.start();
        };

        const interval = setInterval(() => {
            if (webcamRef.current?.video?.readyState === 4) {
                clearInterval(interval);
                initCamera();
            }
        }, 100);

        return () => clearInterval(interval);

    }, []);

    return (
        <div>
            <Webcam
                ref={webcamRef}
                mirrored={true}
                onUserMedia={(m) => { console.log(m) }}
                onUserMediaError={(e) => { console.error(e) }}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    textAlign: "center",
                    zIndex: -1,
                    width,
                    height,
                }}
            />

            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    textAlign: "center",
                    zIndex: 0,
                    width,
                    height,
                }}
            />

            {/* TODO remove this debug info */}
            {indexTip && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(0,0,0,0.6)",
                        color: "white",
                        padding: "10px 20px",
                        borderRadius: "10px",
                        fontFamily: "monospace",
                    }}
                >
                    Index tip: x={indexTip.x.toFixed(1)} | y={indexTip.y.toFixed(1)}
                </div>
            )}
        </div>
    )
}

export default MediapipeHandTracker;
