import * as React from "react";

const subscribe = () => () => {
  /* empty */
};

const getSnapshot = () => true;

const getServerSnapshot = () => false;

const useMounted = () => React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

export { useMounted };
