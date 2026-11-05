import { useEffect, useState } from 'react';
import DisableDevtool from 'disable-devtool';
import { isCompanyAdmin } from './roleService';

let guardActive = false;
let onOpen = () => {};
let onClose = () => {};

// The library is a singleton; React StrictMode and account changes must not
// install duplicate listeners. No URL key or localStorage admin bypass.
export function useDevtoolsGuard(user) {
  const [blocked, setBlocked] = useState(false);
  const enabled = Boolean(user) && !isCompanyAdmin(user);

  useEffect(() => {
    guardActive = enabled;
    onOpen = () => setBlocked(true);
    onClose = () => setBlocked(false);
    setBlocked(false);
    if (enabled && !DisableDevtool.isRunning) {
      const types = DisableDevtool.DetectorType;
      DisableDevtool({
        ignore: () => !guardActive,
        interval: 1000,
        stopIntervalTime: 5000,
        clearLog: false,
        disableMenu: true,
        disableSelect: false,
        disableCopy: false,
        disableCut: false,
        disablePaste: false,
        disableIframeParents: false,
        // Avoid size-based false positives from browser sidebars and debugger
        // statements that can pause the entire learning session.
        detectors: [types.RegToString, types.DefineId, types.DateToString,
          types.FuncToString, types.Performance, types.DebugLib],
        ondevtoolopen: () => { if (guardActive) onOpen(); },
        ondevtoolclose: () => onClose(),
      });
    }
    DisableDevtool.isSuspend = !enabled;
    return () => {
      guardActive = false;
      DisableDevtool.isSuspend = true;
      onOpen = () => {};
      onClose = () => {};
    };
  }, [enabled]);

  return enabled && blocked;
}
