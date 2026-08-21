import * as React from "react";

interface WindowSize {
  width: number;
  height: number;
}

interface UseWindowSizeProps {
  defaultWidth?: number;
  defaultHeight?: number;
}

const RESIZE_DEBOUNCE_MS = 150;

let clientSize: WindowSize = { width: 0, height: 0 };

function subscribe(onStoreChange: () => void): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function onResize() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(onStoreChange, RESIZE_DEBOUNCE_MS);
  }

  window.addEventListener("resize", onResize);
  return () => {
    window.removeEventListener("resize", onResize);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

// useSyncExternalStore re-renders whenever the snapshot identity changes, so only mint a new
// object when the dimensions actually differ
function getSnapshot(): WindowSize {
  if (clientSize.width !== window.innerWidth || clientSize.height !== window.innerHeight) {
    clientSize = { width: window.innerWidth, height: window.innerHeight };
  }
  return clientSize;
}

export function useWindowSize(props: UseWindowSizeProps = {}): WindowSize {
  const { defaultWidth = 0, defaultHeight = 0 } = props;

  const serverSize = React.useMemo(
    () => ({ width: defaultWidth, height: defaultHeight }),
    [defaultWidth, defaultHeight],
  );
  const getServerSnapshot = React.useCallback(() => serverSize, [serverSize]);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
