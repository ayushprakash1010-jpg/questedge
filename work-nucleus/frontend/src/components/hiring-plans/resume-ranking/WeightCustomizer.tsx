"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  DEFAULT_WEIGHTS,
  MAX_WEIGHT,
  WEIGHT_DIMENSIONS,
  moveBoundary,
  setWeight,
  type ScoringWeights,
  type WeightKey,
} from "./weight-distribution";
import styles from "./RankingControls.module.css";

const point = (radius: number, degrees: number) => {
  const angle = ((degrees - 90) * Math.PI) / 180;
  return {
    x: 160 + radius * Math.cos(angle),
    y: 160 + radius * Math.sin(angle),
  };
};
const slicePath = (start: number, end: number) => {
  const a = point(130, start),
    b = point(130, end);
  const c = point(74, end),
    d = point(74, start);
  const large = end - start > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A 130 130 0 ${large} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A 74 74 0 ${large} 0 ${d.x} ${d.y} Z`;
};
const equal = (a: ScoringWeights, b: ScoringWeights) =>
  Object.keys(DEFAULT_WEIGHTS).every(
    (key) => a[key as keyof ScoringWeights] === b[key as keyof ScoringWeights],
  );

interface WeightCustomizerProps {
  weights: ScoringWeights;
  onChange: (weights: ScoringWeights) => void;
}

export default function WeightCustomizer({
  weights,
  onChange,
}: WeightCustomizerProps) {
  const id = useId();
  const wheel = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    pointer: number;
    index: number;
    angle: number;
    delta: number;
    initial: ScoringWeights;
  } | null>(null);
  const [active, setActive] = useState<WeightKey | null>(null);
  const [history, setHistory] = useState<ScoringWeights[]>([]);
  const emitted = useRef(weights);
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  // Older saved settings may still assign points to qualifications.
  useEffect(() => {
    if (weights.educationCertifications !== 0 || weights.logisticsAvailability !== 0 || total !== 100)
      onChange(setWeight(weights, "skillsMatch", weights.skillsMatch + weights.logisticsAvailability));
  }, [weights, total, onChange]);
  useEffect(() => {
    if (!equal(weights, emitted.current)) setHistory([]);
    emitted.current = weights;
  }, [weights]);
  const emit = (next: ScoringWeights) => {
    emitted.current = next;
    onChange(next);
  };
  const remember = () =>
    setHistory((previous) => [...previous.slice(-29), { ...weights }]);
  const commit = (next: ScoringWeights) => {
    if (!equal(next, weights)) {
      remember();
      emit(next);
    }
  };
  const angleAt = (x: number, y: number) => {
    const rect = wheel.current!.getBoundingClientRect();
    return (
      (Math.atan2(
        x - rect.left - rect.width / 2,
        -(y - rect.top - rect.height / 2),
      ) *
        180) /
      Math.PI
    );
  };
  const startDrag = (
    event: React.PointerEvent<SVGCircleElement>,
    index: number,
  ) => {
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointer: event.pointerId,
      index,
      initial: { ...weights },
      angle: angleAt(event.clientX, event.clientY),
      delta: 0,
    };
    remember();
    setActive(WEIGHT_DIMENSIONS[index].key);
  };
  const move = (event: React.PointerEvent<SVGCircleElement>) => {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    const angle = angleAt(event.clientX, event.clientY);
    // Unwrap movement across twelve o'clock to avoid jumping by 100 points.
    state.delta += ((angle - state.angle + 540) % 360) - 180;
    state.angle = angle;
    emit(moveBoundary(state.initial, state.index, state.delta / 3.6));
  };
  const finish = (event: React.PointerEvent<SVGCircleElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  };
  let end = 0;
  const slices = WEIGHT_DIMENSIONS.map((dimension) => {
    const start = end;
    end += weights[dimension.key] * 3.6;
    return { ...dimension, start, end, value: weights[dimension.key] };
  });

  return (
    <section className={styles.card + " " + styles.weightCard} aria-labelledby={id + "-title"}>
      <div className={styles.headingRow}>
        <h3 id={id + "-title"} className={styles.title}>
          Ranking weights
        </h3>
        <div className={styles.actions}>
          <button
            type="button"
            disabled={!history.length}
            onClick={() => {
              const previous = history[history.length - 1];
              if (previous) {
                setHistory(history.slice(0, -1));
                emit(previous);
              }
            }}
          >
            Undo
          </button>
          <span aria-hidden="true">|</span>
          <button
            type="button"
            disabled={equal(weights, DEFAULT_WEIGHTS)}
            onClick={() => commit({ ...DEFAULT_WEIGHTS })}
          >
            Reset defaults
          </button>
        </div>
      </div>
      <p className={styles.subtitle}>
        Drag a boundary to rebalance the weights.
      </p>
      <div className={styles.weightBody}>
        <svg
          ref={wheel}
          viewBox="0 0 320 320"
          className={styles.wheel}
          role="group"
          aria-label="Ranking weight boundaries"
          aria-describedby={id + "-help"}
        >
          {slices
            .filter((s) => s.value > 0)
            .map((slice) => {
              const label = point(103, (slice.start + slice.end) / 2);
              return (
                <g
                  key={slice.key}
                  onPointerEnter={() => setActive(slice.key)}
                  onPointerLeave={() => {
                    if (!drag.current) setActive(null);
                  }}
                >
                  <path
                    d={slicePath(slice.start, slice.end)}
                    fill={slice.color}
                  />
                  {slice.value >= 5 && (
                    <text
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={slice.value < 8 ? 12 : 17}
                      fontWeight="650"
                      pointerEvents="none"
                    >
                      {slice.value}%
                    </text>
                  )}
                </g>
              );
            })}
          <text x="160" y="153" textAnchor="middle" className={styles.total}>
            {total}%
          </text>
          <text
            x="160"
            y="178"
            textAnchor="middle"
            className={styles.allocated}
          >
            Allocated
          </text>
          {slices.map((slice, index) => {
            const next = slices[(index + 1) % slices.length];
            const position = point(130, slice.end);
            const minimum = Math.max(0, slice.value + next.value - MAX_WEIGHT);
            const maximum = Math.min(MAX_WEIGHT, slice.value + next.value);
            return (
              <g key={slice.key + "-boundary"}>
                <circle
                  cx={position.x}
                  cy={position.y}
                  r="8"
                  className={styles.knob}
                />
                <circle
                  cx={position.x}
                  cy={position.y}
                  r="17"
                  className={styles.handle}
                  role="slider"
                  tabIndex={0}
                  aria-label={slice.label + " / " + next.label + " boundary"}
                  aria-orientation="horizontal"
                  aria-valuemin={minimum}
                  aria-valuemax={maximum}
                  aria-valuenow={slice.value}
                  aria-valuetext={
                    slice.label +
                    " " +
                    slice.value +
                    "%, " +
                    next.label +
                    " " +
                    next.value +
                    "%"
                  }
                  onPointerDown={(e) => startDrag(e, index)}
                  onPointerMove={move}
                  onPointerUp={finish}
                  onPointerCancel={finish}
                  onLostPointerCapture={() => {
                    drag.current = null;
                  }}
                  onFocus={() => setActive(slice.key)}
                  onBlur={() => {
                    if (!drag.current) setActive(null);
                  }}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 5 : 1;
                    const delta = {
                      ArrowRight: step,
                      ArrowUp: step,
                      ArrowLeft: -step,
                      ArrowDown: -step,
                      Home: minimum - slice.value,
                      End: maximum - slice.value,
                    }[e.key];
                    if (delta !== undefined) {
                      e.preventDefault();
                      commit(moveBoundary(weights, index, delta));
                    }
                  }}
                >
                  <title>
                    {slice.label + " / " + next.label + " — drag to rebalance"}
                  </title>
                </circle>
              </g>
            );
          })}
        </svg>
        <div className={styles.legend}>
          {slices.map((slice) => (
            <label
              key={slice.key}
              className={
                styles.legendRow +
                (active === slice.key ? " " + styles.highlight : "")
              }
              onPointerEnter={() => setActive(slice.key)}
              onPointerLeave={() => {
                if (!drag.current) setActive(null);
              }}
            >
              <span
                className={styles.swatch}
                style={{ backgroundColor: slice.color }}
              />
              <span className={styles.dimension}>{slice.label}</span>
              <span className={styles.percent}>
                <input
                  type="number"
                  min={0}
                  max={MAX_WEIGHT}
                  step={1}
                  value={slice.value}
                  aria-label={slice.label + " weight"}
                  onFocus={() => setActive(slice.key)}
                  onBlur={() => setActive(null)}
                  onChange={(e) => {
                    if (e.target.value !== "")
                      commit(
                        setWeight(weights, slice.key, Number(e.target.value)),
                      );
                  }}
                />
                %
              </span>
            </label>
          ))}
        </div>
      </div>
      <p id={id + "-help"} className={styles.footer}>
        Total always stays at 100%. Use arrow keys on a boundary or edit a
        percentage.
      </p>
      <details className={styles.policy}>
        <summary>How points are allocated</summary>
        <p>
          Each percentage is that category’s share of the 100 points. Categories
          absent from the JD share their points across the remaining weighted
          categories. Within a category, mandatory requirements receive twice
          the share of preferred requirements. The scorecard shows the final
          points.
        </p>
      </details>
    </section>
  );
}

export { DEFAULT_WEIGHTS };
export type { ScoringWeights };
