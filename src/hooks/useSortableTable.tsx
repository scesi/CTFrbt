"use client";

import { useState, useMemo, useCallback } from "react";

type SortDirection = "asc" | "desc";

interface SortConfig<K extends string> {
  key: K;
  direction: SortDirection;
}

type Accessor<T> = (item: T) => string | number | boolean | null;

/**
 * A reusable hook for sortable tables in the admin dashboard.
 *
 * Usage:
 *   const { sortedData, sortConfig, requestSort, getSortIndicator, getThProps } = useSortableTable(data, { key: 'name', direction: 'asc' }, accessors);
 *
 * - sortedData: The sorted array.
 * - requestSort(key): Call when a column header is clicked.
 * - getSortIndicator(key): Returns the ▲/▼ indicator JSX for a column.
 * - getThProps(key, extraStyle?): Returns { className, style, onClick, children-wrapper } props for a <th>.
 */
export function useSortableTable<
  T,
  Accessors extends Record<string, Accessor<T>>,
>(
  data: T[],
  defaultSort: SortConfig<string & keyof Accessors>,
  accessors: Accessors,
) {
  type K = string & keyof Accessors;

  const [sortConfig, setSortConfig] = useState<SortConfig<K>>(defaultSort);

  const requestSort = useCallback((key: K) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const sortedData = useMemo(() => {
    const sorted = [...data];
    const accessor = accessors[sortConfig.key];
    if (!accessor) return sorted;

    sorted.sort((a, b) => {
      const aVal = accessor(a);
      const bVal = accessor(b);

      // Nulls last
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal, undefined, {
          sensitivity: "base",
        });
      } else if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        comparison = aVal === bVal ? 0 : aVal ? -1 : 1;
      } else {
        comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [data, sortConfig, accessors]);

  const getSortIndicator = useCallback(
    (key: K) => {
      if (sortConfig.key !== key) {
        return (
          <span className="sort-indicator" aria-hidden="true">
            ↕
          </span>
        );
      }
      return (
        <span className="sort-indicator" aria-hidden="true">
          {sortConfig.direction === "asc" ? "▲" : "▼"}
        </span>
      );
    },
    [sortConfig],
  );

  const getThProps = useCallback(
    (key: K, extraStyle?: React.CSSProperties) => ({
      className: `sortable${sortConfig.key === key ? " sort-active" : ""}`,
      style: extraStyle,
      onClick: () => requestSort(key),
    }),
    [sortConfig, requestSort],
  );

  return { sortedData, sortConfig, requestSort, getSortIndicator, getThProps };
}
