"use client";

import { useEffect, useState, useMemo } from "react";
import { IconType } from "react-icons";

interface TeamIconProps {
  name: string;
  color?: string;
  size?: number;
  fallback?: React.ReactNode;
}

let cachedIconsModule: Record<string, IconType> | null = null;
let iconsModulePromise: Promise<Record<string, IconType>> | null = null;

function loadIconsModule(): Promise<Record<string, IconType>> {
  if (cachedIconsModule) {
    return Promise.resolve(cachedIconsModule);
  }
  if (!iconsModulePromise) {
    iconsModulePromise = import("react-icons/gi").then((mod) => {
      cachedIconsModule = mod as unknown as Record<string, IconType>;
      return cachedIconsModule;
    });
  }
  return iconsModulePromise;
}

export default function TeamIcon({
  name,
  color = "var(--fg)",
  size = 20,
  fallback = null,
}: TeamIconProps) {
  const [moduleIcons, setModuleIcons] = useState<Record<
    string,
    IconType
  > | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (cachedIconsModule) {
      setModuleIcons(cachedIconsModule);
      return;
    }
    loadIconsModule().then((icons) => {
      if (isMounted) {
        setModuleIcons(icons);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const IconComponent = useMemo(() => {
    if (!moduleIcons && !cachedIconsModule) return null;
    const source = moduleIcons || cachedIconsModule;
    return source ? source[name] : null;
  }, [name, moduleIcons]);

  if (!IconComponent) {
    return <>{fallback}</>;
  }

  return (
    <IconComponent
      style={{
        fontSize: `${size}px`,
        color: color,
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  );
}
