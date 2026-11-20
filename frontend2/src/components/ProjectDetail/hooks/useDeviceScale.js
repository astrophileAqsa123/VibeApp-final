import { useEffect, useRef, useState } from "react";

import { DEVICE_FRAME_SIZES } from "../constants";

/**
 * Scales the device shell so the complete phone/tablet fits inside the stage.
 * Attach the returned `stageRef` to the stage element.
 * The iframe itself still renders at the real, unscaled viewport size.
 */
export default function useDeviceScale({ device, activeTab, isGenerating, ready }) {
  const stageRef = useRef(null);
  const [deviceScale, setDeviceScale] = useState(1);

  useEffect(() => {
    if (activeTab !== "preview" || isGenerating || !ready) return undefined;

    const stage = stageRef.current;
    if (!stage) return undefined;

    const updateDeviceScale = () => {
      const size = DEVICE_FRAME_SIZES[device] || DEVICE_FRAME_SIZES.iphone;
      const styles = window.getComputedStyle(stage);
      const horizontalPadding =
        (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
      const verticalPadding =
        (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);

      const availableWidth = Math.max(1, stage.clientWidth - horizontalPadding);
      const availableHeight = Math.max(1, stage.clientHeight - verticalPadding);
      const nextScale = Math.min(
        1,
        availableWidth / size.outerWidth,
        availableHeight / size.outerHeight
      );

      // Keep the complete device visible.
      setDeviceScale(Math.max(0.25, nextScale));
    };

    updateDeviceScale();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateDeviceScale) : null;
    observer?.observe(stage);
    window.addEventListener("resize", updateDeviceScale);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateDeviceScale);
    };
  }, [device, activeTab, isGenerating, ready]);

  return { stageRef, deviceScale };
}
