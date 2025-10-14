import React, { useEffect, useState } from 'react';

export interface TutorialLightboxProps {
  anchor: HTMLElement | null;
}

const TutorialLightbox: React.FC<TutorialLightboxProps> = ({ anchor }) => {
  const [rect, setRect] = useState<DOMRectReadOnly | undefined>();

  useEffect(() => {
    if (!anchor) {
      setRect(undefined);
      return;
    }

    const root = document.getElementById('root');
    if (!root) {
      throw new Error('Root element not found for TutorialLightbox');
    }

    const box = anchor.getBoundingClientRect();
    setRect(DOMRectReadOnly.fromRect(box));

    const resizeObserver = new ResizeObserver(() => {
      const box = anchor.getBoundingClientRect();
      setRect(DOMRectReadOnly.fromRect(box));
    });

    const mutationObserver = new MutationObserver(() => {
      const box = anchor.getBoundingClientRect();
      if (box.x !== rect?.x || box.y !== rect.y || box.width !== rect.width || box.height !== rect.height) {
        setRect(DOMRectReadOnly.fromRect(box));
      }
    });

    resizeObserver.observe(anchor);
    mutationObserver.observe(root, { attributes: true, childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };

    // We don't want to re-run this effect when the rect changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  if (!rect) return null;

  return (
    <svg className="size-full fixed inset-0 z-70 pointer-events-none">
      <defs>
        <mask id="lightbox-mask">
          {/* Full screen opaque */}
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {/* Transparent rectangle (the "cutout") */}
          <rect x={rect.left} y={rect.top} width={rect.width} height={rect.height} fill="black" />
        </mask>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#lightbox-mask)" />
      <rect
        x={rect.left - 1}
        y={rect.top - 1}
        width={rect.width + 2}
        height={rect.height + 2}
        fill="transparent"
        strokeWidth="2"
        className="stroke-primary"
      />
    </svg>
  );
};

export default TutorialLightbox;
