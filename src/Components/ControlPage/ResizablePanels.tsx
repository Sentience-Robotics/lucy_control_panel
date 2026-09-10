import {
  useState,
  useRef,
  useCallback,
  useEffect,
  Fragment,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { UI_ACCENT_GREEN, UI_BORDER_STRONG } from '../../Constants/uiTheme';

type Direction = 'horizontal' | 'vertical';

interface ResizablePanelsProps {
  children: ReactNode[];
  /** Starting size of each panel as a percentage, e.g. [10, 50, 40]. Must have one entry per child. */
  proportions: number[];
  direction?: Direction;
  /** Minimum size any panel can shrink to, as a percentage (0-100). */
  minSize?: number;
  /** Space between panels, in px. The draggable handle lives inside this gap. */
  gap?: number;
  lineThickness?: number;
}

const normalize = (values: number[]): number[] => {
  if (values.length === 0) return [];

  const total = values.reduce((sum, v) => sum + v, 0);

  if (total === 0) {
    return values.map(() => 100 / values.length);
  }

  return values.map((v) => (v / total) * 100);
};

const ResizablePanels = ({
  children,
  proportions,
  direction = 'horizontal',
  minSize = 5,
  gap = 12,
  lineThickness = 2,
}: ResizablePanelsProps) => {
  // Remove null/undefined/false children before calculating the panel count.
  const panels = (Array.isArray(children) ? children : [children]).filter(
    (panel): panel is ReactNode => panel != null && panel !== false
  );

  const count = panels.length;

  const [sizes, setSizes] = useState<number[]>(() =>
    proportions.length === count
      ? normalize(proportions)
      : normalize(Array(count).fill(1))
  );

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);
  const startPos = useRef(0);
  const startSizes = useRef<number[]>([]);

  const isHorizontal = direction === 'horizontal';
  const sizeKey = isHorizontal ? 'width' : 'height';

  const proportionsKey = proportions.join(',');
  useEffect(() => {
    setSizes(
      proportions.length === count
        ? normalize(proportions)
        : normalize(Array(count).fill(1))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, proportionsKey]);

  const handleMouseDown = useCallback(
    (index: number) => (e: ReactMouseEvent<HTMLDivElement>) => {
      e.preventDefault();

      dragIndex.current = index;
      startPos.current = isHorizontal ? e.clientX : e.clientY;
      startSizes.current = [...sizes];

      setActiveIndex(index);

      document.body.style.cursor = isHorizontal
        ? 'col-resize'
        : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [sizes, isHorizontal]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragIndex.current === null || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const totalSize = isHorizontal ? rect.width : rect.height;

      if (totalSize <= 0) return;

      const currentPos = isHorizontal ? e.clientX : e.clientY;
      const deltaPct =
        ((currentPos - startPos.current) / totalSize) * 100;

      const i = dragIndex.current;

      if (i >= startSizes.current.length - 1) return;

      const newSizes = [...startSizes.current];

      let left = newSizes[i] + deltaPct;
      let right = newSizes[i + 1] - deltaPct;

      if (left < minSize) {
        right -= minSize - left;
        left = minSize;
      }

      if (right < minSize) {
        left -= minSize - right;
        right = minSize;
      }

      newSizes[i] = left;
      newSizes[i + 1] = right;

      setSizes(newSizes);
    },
    [isHorizontal, minSize]
  );

  const handleMouseUp = useCallback(() => {
    dragIndex.current = null;
    setActiveIndex(null);

    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        width: '100%',
        height: '100%',
      }}
    >
      {panels.map((panel, i) => (
        <Fragment key={i}>
          <div
            style={{
              [sizeKey]: `${sizes[i] ?? 0}%`,
              flexShrink: 0,
              flexGrow: 0,
              overflow: 'auto',
              minWidth: 0,
              minHeight: 0,
              boxSizing: 'border-box',
            }}
          >
            {panel}
          </div>

          {i < panels.length - 1 &&
            (() => {
              const isEngaged =
                hoverIndex === i || activeIndex === i;

              return (
                <div
                  onMouseDown={handleMouseDown(i)}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                  style={{
                    [sizeKey]: `${gap}px`,
                    flexShrink: 0,
                    flexGrow: 0,
                    position: 'relative',
                    cursor: isHorizontal
                      ? 'col-resize'
                      : 'row-resize',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: isHorizontal ? 0 : '50%',
                      left: isHorizontal ? '50%' : 0,
                      width: isHorizontal
                        ? `${isEngaged ? lineThickness + 2 : lineThickness}px`
                        : '100%',
                      height: isHorizontal
                        ? '100%'
                        : `${isEngaged ? lineThickness + 2 : lineThickness}px`,
                      transform: isHorizontal
                        ? 'translateX(-50%)'
                        : 'translateY(-50%)',
                      background: isEngaged
                        ? UI_ACCENT_GREEN
                        : UI_BORDER_STRONG,
                      transition:
                        'background 0.15s ease, width 0.15s ease, height 0.15s ease',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              );
            })()}
        </Fragment>
      ))}
    </div>
  );
};

export default ResizablePanels;
