import { useCallback, useMemo, useState } from "react";

/**
 * Phase 11 Group C — minimal bulk-selection state management.
 *
 * Usage:
 *   const { selectedIds, isSelected, toggleId, toggleAll, clear, count } =
 *     useBulkSelect(allIds);
 *
 * Pure state — no opinions about the row component or the action bar.
 */
export function useBulkSelect<T extends string = string>(allIds: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());

  const isSelected = useCallback((id: T) => selectedIds.has(id), [selectedIds]);

  const toggleId = useCallback((id: T) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      // If everything is selected → clear. Otherwise → select all.
      if (prev.size === allIds.length && allIds.length > 0) return new Set();
      return new Set(allIds);
    });
  }, [allIds]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const allSelected = useMemo(
    () => allIds.length > 0 && selectedIds.size === allIds.length,
    [selectedIds.size, allIds.length],
  );

  return {
    selectedIds: Array.from(selectedIds),
    isSelected,
    toggleId,
    toggleAll,
    clear,
    count: selectedIds.size,
    allSelected,
  };
}
