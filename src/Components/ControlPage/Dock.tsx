import {
  type ReactNode,
} from 'react';

interface DockProps {
  childrens: Record<string, ReactNode>;
  current: string;
}

export const Dock = ({
  childrens,
  current,
}: DockProps) => {
  const currentChild = childrens[current];

  if (!currentChild) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        minHeight: 0,
      }}
    >
      {currentChild}
    </div>
  );
};
