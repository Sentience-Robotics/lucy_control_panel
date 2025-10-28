import { HAND_CONNECTIONS, Hands, type Results } from "@mediapipe/hands";
import React, { useEffect, useRef } from "react";
import Webcam from "react-webcam";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

interface MediapipeHandTrackerProps { width?: number, height?: number }
const MediapipeHandTracker: React.FC<MediapipeHandTrackerProps> = ({ width, height }) => {

    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
                onUserMedia={(m) => { console.log(m) } }
                onUserMediaError={(e) => { console.error(e) }}
            // style={{
            //     position: "absolute",
            //     left: 0,
            //     right: 0,
            //     textAlign: "center",
            //     zIndex: 9,
            //     width,
            //     height,
            // }}
            />

            <canvas
                ref={canvasRef}
            // style={{
            //     position: "absolute",
            //     left: 0,
            //     right: 0,
            //     textAlign: "center",
            //     zIndex: 10,
            //     width,
            //     height,
            // }}
            />
        </div>
    )
}

export default MediapipeHandTracker;
