import { HAND_CONNECTIONS, Hands, type Results, type NormalizedLandmark} from "@mediapipe/hands";
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HANDS_MODEL_CONFIG, MEDIAPIPE_HANDS_URL } from "../Constants/MediaPipe";

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
    type Point3D = { x: number; y: number; z: number };
    type finger3D = {tip: Point3D, dip: Point3D, pip: Point3D, mcp: Point3D, wrist: Point3D};
    type finger3DSample = {point1: Point3D, point2: Point3D, point3: Point3D};

    // const THUMB_FINGER = {
    //     TIP: 4,
    //     DIP: 3,
    //     PIP: 2,
    //     MCP: 1
    // };

    const INDEX_FINGER = {
        TIP: 8,
        DIP: 7,
        PIP: 6,
        MCP: 5
    };

    // const MIDDLE_FINGER = {
    //     TIP: 12,
    //     DIP: 11,
    //     PIP: 10,
    //     MCP: 9
    // };

    // const RING_FINGER = {
    //     TIP: 16,
    //     DIP: 15,
    //     PIP: 14,
    //     MCP: 13
    // };

    // const PINKY_FINGER = {
    //     TIP: 20,
    //     DIP: 19,
    //     PIP: 18,
    //     MCP: 17
    // };


    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [indexTip, setIndexTip] = useState<{ x: number; y: number } | null>(null);
    const lastProcessTimeRef = useRef<number>(0);

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
        // calls the processHands() function once a second
        const now = Date.now();
        if (now - lastProcessTimeRef.current >= 1000) {
            lastProcessTimeRef.current = now;
            processHands(results.multiHandLandmarks);
        }

        ctx.restore();
    };


    function processHands(hands: NormalizedLandmark[][]) {
    hands.forEach((hand, handIndex) => {
        processFinger({tip: hand[INDEX_FINGER.TIP], 
            dip: hand[INDEX_FINGER.DIP], 
            pip: hand[INDEX_FINGER.PIP], 
            mcp: hand[INDEX_FINGER.MCP], 
            wrist: hand[0],
        }, `Index finger of hand ${handIndex}: `);
        
    });
    };

    function processFinger(finger: finger3D, message: string) {
        const sample1: finger3DSample = {point1: finger.tip, point2: finger.dip, point3: finger.pip};
        const sample2: finger3DSample = {point1: finger.dip, point2: finger.pip, point3: finger.mcp};
        const sample3: finger3DSample = {point1: finger.pip, point2: finger.mcp, point3: finger.wrist};

        const angle1: number = angleBetweenPoints3D(sample1);
        const angle2: number = angleBetweenPoints3D(sample2);
        const angle3: number = angleBetweenPoints3D(sample3);
        const flex: number = flexingPercentage(angle1, angle2, angle3);

        console.log(message, `angle1: ${angle1}, angle2: ${angle2}, angle3: ${angle3}`);
        console.log(message, `flexing percentage: ${flex}`);
    };

    // Returns a value between O (fully relaxed) and 1 (fully flexed) using the 3 joint angles in a finger
    function flexingPercentage(angle1: number, angle2: number, angle3: number): number {
        const fullRelaxedLowerLimit = 0.3;
        const fullFlexedHigherLimit = 0.9;

        const clamp = (value: number, min: number, max: number): number =>
            Math.min(Math.max(value, min), max);

        const toPercentage = (angle: number): number => {
            const clamped = clamp(angle, fullRelaxedLowerLimit, fullFlexedHigherLimit);
            return (clamped - fullRelaxedLowerLimit) /
                (fullFlexedHigherLimit - fullRelaxedLowerLimit);
        };

        const percentage1 = toPercentage(angle1);
        const percentage2 = toPercentage(angle2);
        const percentage3 = toPercentage(angle3);

        return (percentage1 + percentage2 + percentage3) / 3;
    }

    // Returns the angle of flexion (in radians) of a joint (= 3 3D points)
    function angleBetweenPoints3D(
        // a: Point3D,
        // b: Point3D,
        // c: Point3D
        sample: finger3DSample
        ): number {
        // Build vectors "BA" and "BC" for the math formula
        const v1x = sample.point1.x - sample.point2.x;
        const v1y = sample.point1.y - sample.point2.y;
        const v1z = sample.point1.z - sample.point2.z;

        const v2x = sample.point3.x - sample.point2.x;
        const v2y = sample.point3.y - sample.point2.y;
        const v2z = sample.point3.z - sample.point2.z;

        // Dot product
        const dot = v1x * v2x + v1y * v2y + v1z * v2z;

        // Vector magnitudes
        const mag1 = Math.hypot(v1x, v1y, v1z);
        const mag2 = Math.hypot(v2x, v2y, v2z);

        // Avoid division by zero
        if (mag1 === 0 || mag2 === 0) return 0;

        // Clamp for numerical stability
        const cosTheta = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));

        // Angle in radians, substracted to PI to get the internal angle of the joint bending
        return Math.PI - Math.acos(cosTheta);
    };

    useEffect(() => {
        const hands = new Hands({
            locateFile: (file) => `${MEDIAPIPE_HANDS_URL}${file}`,
        });
        hands.setOptions(HANDS_MODEL_CONFIG);
        hands.onResults(onResults);

        const initCamera = () => {
            if (!webcamRef.current?.video) { return; }
            const camera = new Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (!webcamRef.current?.video) { return; }
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
                        background: UI_OVERLAY_BACKDROP_SOFT,
                        color: UI_TEXT_PRIMARY_ON_DARK,
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
