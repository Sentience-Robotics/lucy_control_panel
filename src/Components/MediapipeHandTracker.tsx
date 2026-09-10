import { HAND_CONNECTIONS, Hands, type Results, type NormalizedLandmark, type Handedness } from "@mediapipe/hands";
import React, { useEffect, useRef } from "react";
import Webcam from "react-webcam";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HANDS_MODEL_CONFIG, MEDIAPIPE_HANDS_URL } from "../Constants/MediaPipe";

const UPDATE_HZ_S = 5;

enum ControlMode {
    Fingers = "fingers",
    Claw = "claw",
}

const CONTROL_MODE: ControlMode = ControlMode.Claw;


interface MediapipeHandTrackerProps {
    width?: number;
    height?: number;
    moveRobotIndex: (x: number, jointName: string) => void;
    onAspectRatioChange?: (ratio: number) => void;
}

const MediapipeHandTracker: React.FC<MediapipeHandTrackerProps> = ({
    width,
    height,
    moveRobotIndex,
    onAspectRatioChange
}) => {
    type Point3D = { x: number; y: number; z: number };
    type Finger3D = {tip: Point3D, dip: Point3D, pip: Point3D, mcp: Point3D, wrist: Point3D, jointName: string};
    type Finger3DSample = {point1: Point3D, point2: Point3D, point3: Point3D};
    type Finger3DIndex = {TIP: number, DIP: number, PIP: number, MCP: number}
    type FingerIndex = { name: string, idx: Finger3DIndex }
    
    const Fingers: Array<FingerIndex> = [
        {
            name: "i01.side.thumb_link_joint", idx: {
                TIP: 4,
                DIP: 3,
                PIP: 2,
                MCP: 1
            }
        },
        {
            name: "i01.side.index_link_joint", idx: {
                TIP: 8,
                DIP: 7,
                PIP: 6,
                MCP: 5
            }
        },
        {
            name: "i01.side.majeure_link_joint", idx: {
                TIP: 12,
                DIP: 11,
                PIP: 10,
                MCP: 9
            }
        },
        {
            name: "i01.side.ringFinger_link_joint", idx: {
                TIP: 16,
                DIP: 15,
                PIP: 14,
                MCP: 13
            }
        },
        {
            name: "i01.side.pinky_link_joint", idx: {
                TIP: 20,
                DIP: 19,
                PIP: 18,
                MCP: 17
            }
        },
    ]

    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastProcessTimeRef = useRef<number>(0);
    const reportedRatioRef = useRef<number | null>(null);
    const aspectRatioCallbackRef = useRef(onAspectRatioChange);
    aspectRatioCallbackRef.current = onAspectRatioChange;

    const onResults = (results: Results) => {
        if (!webcamRef.current?.video || !canvasRef.current) return;

        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        if (videoWidth && videoHeight) {
            const ratio = videoWidth / videoHeight;
            if (reportedRatioRef.current !== ratio) {
                reportedRatioRef.current = ratio;
                aspectRatioCallbackRef.current?.(ratio);
            }
        }

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
        if (now - lastProcessTimeRef.current >= 1000 / UPDATE_HZ_S) {
            lastProcessTimeRef.current = now;
            processHands(results.multiHandLandmarks, results.multiHandedness);
        }

        ctx.restore();
    };

    
    function processHands(hands: NormalizedLandmark[][], handedness: Handedness[]) {
        hands.forEach((hand, handIndex) => {
            for (let i = 0; i < 5; i++) {
                
                const label: string =
                handedness[handIndex].label === "Left"
                ? "leftHand"
                : "rightHand";
                
                if (CONTROL_MODE === "claw") {
                    processClaw(hand, label);
                    return;
                }

                processFinger({
                    tip: hand[Fingers[i].idx.TIP],
                    dip: hand[Fingers[i].idx.DIP],
                    pip: hand[Fingers[i].idx.PIP],
                    mcp: hand[Fingers[i].idx.MCP],
                    wrist: hand[0],
                    jointName: Fingers[i].name.replace("side", label)
                });
            }
        });
    };
    
    function processClaw(hand: NormalizedLandmark[], handLabel: string) {
        const thumbTip = hand[4];
        const fingerTips = [hand[8], hand[12], hand[16], hand[20]]; // index, middle, ring, pinky

        const avgTip: Point3D = {
            x: fingerTips.reduce((sum, p) => sum + p.x, 0) / fingerTips.length,
            y: fingerTips.reduce((sum, p) => sum + p.y, 0) / fingerTips.length,
            z: fingerTips.reduce((sum, p) => sum + p.z, 0) / fingerTips.length,
        };

        const pinchDistance = distance3D(thumbTip, avgTip);

        // Normalize by hand size (wrist to middle-finger MCP) so pinch detection
        // doesn't depend on how close the hand is to the camera
        const handScale = distance3D(hand[0], hand[9]);
        const normalizedDistance = handScale > 0 ? pinchDistance / handScale : 0;

        const clawOpenness = clawPercentage(normalizedDistance);

        moveRobotIndex(clawOpenness, `jaw`);
    }

    function distance3D(a: Point3D, b: Point3D): number {
        return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    // Returns 0 (pinched/closed) to 1 (fully open) from a normalized thumb-to-fingers distance
    function clawPercentage(normalizedDistance: number): number {
        const pinchedLowerLimit = 0.15; // calibrate: value when thumb touches fingers
        const openHigherLimit = 0.9;    // calibrate: value when hand is fully spread

        const clamp = (value: number, min: number, max: number): number =>
            Math.min(Math.max(value, min), max);

        const clamped = clamp(normalizedDistance, pinchedLowerLimit, openHigherLimit);
        return (clamped - pinchedLowerLimit) / (openHigherLimit - pinchedLowerLimit);
    }

    function processFinger(finger: Finger3D) {
        const sample1: Finger3DSample = {point1: finger.tip, point2: finger.dip, point3: finger.pip};
        const sample2: Finger3DSample = {point1: finger.dip, point2: finger.pip, point3: finger.mcp};
        const sample3: Finger3DSample = {point1: finger.pip, point2: finger.mcp, point3: finger.wrist};

        const angle1: number = angleBetweenPoints3D(sample1);
        const angle2: number = angleBetweenPoints3D(sample2);
        const angle3: number = angleBetweenPoints3D(sample3);
        const flex: number = flexingPercentage(angle1, angle2, angle3);

        moveRobotIndex(flex, finger.jointName);
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
        sample: Finger3DSample
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
        hands.setOptions({
            ...HANDS_MODEL_CONFIG,
            maxNumHands: CONTROL_MODE === ControlMode.Claw ? 1 : 2,
        });
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
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <Webcam
                ref={webcamRef}
                mirrored={true}
                onUserMedia={(m) => { console.log(m) }}
                onUserMediaError={(e) => { console.error(e) }}
                style={{
                    position: "absolute",
                    inset: 0,
                    textAlign: "center",
                    zIndex: -1,
                    width: width ?? "100%",
                    height: height ?? "100%",
                    objectFit: "contain",
                }}
            />

            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    textAlign: "center",
                    zIndex: 0,
                    width: width ?? "100%",
                    height: height ?? "100%",
                    objectFit: "contain",
                }}
            />
        </div>
    )
}

export default MediapipeHandTracker;
