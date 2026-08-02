"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { IconType } from "react-icons";

interface IconData {
  name: string;
  component: IconType;
}

interface TeamIconSelectorProps {
  value: string;
  color: string;
  onChange: (iconName: string) => void;
}

const BASE_GRID_WIDTH = 64;

let iconCatalogPromise: Promise<IconData[]> | null = null;

function loadIconCatalog(): Promise<IconData[]> {
  if (!iconCatalogPromise) {
    iconCatalogPromise = import("react-icons/gi").then((module) => {
      const moduleIcons = module as unknown as Record<string, IconType>;
      return Object.keys(moduleIcons)
        .filter((name) => name.startsWith("Gi"))
        .map((name) => ({
          name,
          component: moduleIcons[name] as IconType,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    });
  }
  return iconCatalogPromise;
}

function formatLabel(name: string): string {
  return name
    .replace(/^Gi/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}

export default function TeamIconSelector({
  value,
  color,
  onChange,
}: TeamIconSelectorProps) {
  const [icons, setIcons] = useState<IconData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const loadIcons = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const catalog = await loadIconCatalog();
        setIcons(catalog);
      } catch {
        setLoadError("Failed to load icons");
      }
      setLoading(false);
    };
    loadIcons();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      setContainerWidth(containerRef.current!.offsetWidth);
    };

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(containerRef.current);
    updateWidth();

    return () => observer.disconnect();
  }, []);

  const cols = useMemo(
    () =>
      containerWidth > 0
        ? Math.max(1, Math.floor(containerWidth / BASE_GRID_WIDTH))
        : 5,
    [containerWidth],
  );

  const pageSize = cols * 5;

  const filteredIcons = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = icons.filter((icon) =>
      icon.name.toLowerCase().includes(query),
    );
    const currentPage = (page - 1) * pageSize;
    return {
      items: filtered.slice(currentPage, currentPage + pageSize),
      total: filtered.length,
    };
  }, [icons, searchQuery, page, pageSize]);

  const totalPages =
    filteredIcons.total > 0
      ? Math.ceil(filteredIcons.total / pageSize) || 1
      : 1;

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleIconClick = useCallback(
    (name: string) => {
      onChange(name);
    },
    [onChange],
  );

  return (
    <div ref={containerRef}>
      <input
        type="text"
        className="form-input"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search icons..."
        style={{ fontSize: "13px", marginBottom: "10px" }}
        disabled={loading}
      />

      {loadError && (
        <p style={{ color: "var(--danger)", fontSize: "12px" }}>{loadError}</p>
      )}

      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "120px",
            fontSize: "12px",
            color: "var(--fg-dim)",
          }}
        >
          Loading icons...
        </div>
      ) : filteredIcons.total === 0 ? (
        <p style={{ fontSize: "12px", color: "var(--fg-dim)" }}>
          No icons match your search.
        </p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: "8px",
            }}
          >
            {filteredIcons.items.map((icon) => {
              const Icon = icon.component;
              const isSelected = icon.name === value;
              return (
                <button
                  key={icon.name}
                  type="button"
                  onClick={() => handleIconClick(icon.name)}
                  aria-label={formatLabel(icon.name)}
                  title={formatLabel(icon.name)}
                  style={{
                    width: "56px",
                    height: "56px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: isSelected
                      ? "2px solid var(--accent)"
                      : "1px solid var(--border)",
                    background: isSelected
                      ? "rgba(255, 255, 255, 0.05)"
                      : "transparent",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <Icon
                    style={{
                      fontSize: "28px",
                      color: isSelected ? color : "var(--fg-dim)",
                    }}
                  />
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "10px",
              fontSize: "12px",
              color: "var(--fg-dim)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <button
              type="button"
              onClick={handlePrev}
              disabled={page <= 1}
              aria-label="Previous icon page"
              title="Previous icon page"
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: page <= 1 ? "var(--fg-dim)" : "var(--fg)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                padding: "4px 10px",
              }}
            >
              ←
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={page >= totalPages}
              aria-label="Next icon page"
              title="Next icon page"
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: page >= totalPages ? "var(--fg-dim)" : "var(--fg)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                padding: "4px 10px",
              }}
            >
              →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
