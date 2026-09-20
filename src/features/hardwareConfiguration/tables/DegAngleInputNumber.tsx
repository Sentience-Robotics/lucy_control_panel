/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { InputNumber } from 'antd';
import { useEffect, useState, type CSSProperties } from 'react';
import { degreeToRadian, radianToDegree } from '../../../Utils/math.utils.ts';

type Props = {
    /** Stored YAML value in radians. */
    radValue: unknown;
    onCommitRad: (rad: number) => void;
    style?: CSSProperties;
    title?: string;
    step?: number;
    /** Optional UI clamp in degrees (e.g. 0–360 for servo limits). */
    minDeg?: number;
    maxDeg?: number;
};

/**
 * Degrees in the UI, radians in YAML. Draft freely while focused; round to an
 * integer degree and write rad only on blur (avoids deg↔rad jitter mid-typing).
 */
export function DegAngleInputNumber({
    radValue,
    onCommitRad,
    style,
    title,
    step = 1,
    minDeg,
    maxDeg,
}: Props) {
    const [focused, setFocused] = useState(false);
    const [draft, setDraft] = useState<number | null>(null);

    const roundedDegFromRad = (): number | null => {
        const rad = Number(radValue);
        if (!Number.isFinite(rad)) return null;
        return Math.round(radianToDegree(rad));
    };

    useEffect(() => {
        if (!focused) {
            setDraft(null);
        }
    }, [radValue, focused]);

    const display = focused ? draft : roundedDegFromRad();

    return (
        <InputNumber
            size="small"
            step={step}
            min={minDeg}
            max={maxDeg}
            precision={focused ? undefined : 0}
            style={{ width: '100%', ...style }}
            title={title}
            value={display ?? undefined}
            onFocus={() => {
                setFocused(true);
                setDraft(roundedDegFromRad());
            }}
            onChange={(val) => {
                setDraft(typeof val === 'number' && Number.isFinite(val) ? val : null);
            }}
            onBlur={() => {
                setFocused(false);
                if (draft == null || !Number.isFinite(draft)) {
                    setDraft(null);
                    return;
                }
                let deg = Math.round(draft);
                if (typeof minDeg === 'number') deg = Math.max(minDeg, deg);
                if (typeof maxDeg === 'number') deg = Math.min(maxDeg, deg);
                onCommitRad(degreeToRadian(deg));
                setDraft(null);
            }}
        />
    );
}
