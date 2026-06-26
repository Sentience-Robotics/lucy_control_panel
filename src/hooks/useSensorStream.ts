import { useCallback, useEffect, useState } from 'react';
import type { SensorSource } from '../Constants/rosConfig';
import { SensorHandler } from '../Services/ros/handlers/Sensor.handler';

const HISTORY_MS = 60_000;

export interface SensorSample {
    time: number;
    value: number;
}

export interface SensorStreamState {
    displaySamples: SensorSample[];
    currentValue: number | null;
    historicalMin: number | null;
    historicalMax: number | null;
    isPaused: boolean;
    setPaused: (paused: boolean) => void;
}

/** Live samples for one pressure sensor on a `sensors/<scope>` topic. */
export function useSensorStream(source: SensorSource | null): SensorStreamState {
    const [sourceSamples, setSourceSamples] = useState<SensorSample[]>([]);
    const [displaySamples, setDisplaySamples] = useState<SensorSample[]>([]);
    const [currentValue, setCurrentValue] = useState<number | null>(null);
    const [historicalMin, setHistoricalMin] = useState<number | null>(null);
    const [historicalMax, setHistoricalMax] = useState<number | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    const onSample = useCallback((value: number, timestampMs: number) => {
        setSourceSamples((prev) => {
            const next = [...prev, { time: timestampMs, value }];
            return next.filter((sample) => timestampMs - sample.time < HISTORY_MS);
        });
        setHistoricalMin((prev) => (prev === null ? value : Math.min(prev, value)));
        setHistoricalMax((prev) => (prev === null ? value : Math.max(prev, value)));
    }, []);

    useEffect(() => {
        if (!source) return undefined;

        const handler = SensorHandler.getInstance();
        handler.subscribe(source.id, source.topic, source.arrayIndex, onSample);
        return () => {
            handler.unsubscribe(source.id, source.topic, onSample);
        };
    }, [source, onSample]);

    useEffect(() => {
        setSourceSamples([]);
        setDisplaySamples([]);
        setCurrentValue(null);
        setHistoricalMin(null);
        setHistoricalMax(null);
        if (!source) return;
    }, [source]);

    useEffect(() => {
        if (!isPaused) {
            setDisplaySamples(sourceSamples);
        }
    }, [sourceSamples, isPaused]);

    useEffect(() => {
        const latest = displaySamples[displaySamples.length - 1];
        setCurrentValue(latest?.value ?? null);
    }, [displaySamples]);

    const setPaused = useCallback((paused: boolean) => {
        setIsPaused(paused);
        if (!paused) {
            setDisplaySamples(sourceSamples);
        }
    }, [sourceSamples]);

    return {
        displaySamples,
        currentValue,
        historicalMin,
        historicalMax,
        isPaused,
        setPaused,
    };
}
