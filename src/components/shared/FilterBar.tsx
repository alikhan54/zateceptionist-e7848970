import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterBarProps {
  /** controlled query value (or omitted to make uncontrolled with onSearch only) */
  value?: string;
  onSearch: (q: string) => void;
  placeholder?: string;
  /** ms debounce; defaults to 250 */
  debounceMs?: number;
  /** optional category dropdown */
  category?: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    label?: string;
  };
  /** optional sort dropdown */
  sort?: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    label?: string;
  };
  testidPrefix?: string;
}

/**
 * Phase 11 Group C — reusable filter bar.
 *
 * Search input with debounce + optional category + optional sort. Each
 * dropdown is decoupled and optional so list pages can opt in to whichever
 * facets fit. The search is debounced to avoid hammering React Query.
 */
export function FilterBar({ value, onSearch, placeholder = "Search…", debounceMs = 250, category, sort, testidPrefix = "filter" }: FilterBarProps) {
  const [local, setLocal] = useState<string>(value ?? "");

  // Sync from outside if the prop changes (e.g. URL → state)
  useEffect(() => { if (value !== undefined) setLocal(value); }, [value]);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => onSearch(local), debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, debounceMs]);

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid={`${testidPrefix}-bar`}>
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={placeholder}
          className="pl-8 pr-8 h-9 text-sm"
          data-testid={`${testidPrefix}-search-input`}
        />
        {local && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setLocal("")}
            data-testid={`${testidPrefix}-search-clear`}
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      {category && (
        <select
          value={category.value}
          onChange={(e) => category.onChange(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          data-testid={`${testidPrefix}-category-select`}
          aria-label={category.label || "Category"}
        >
          {category.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      )}
      {sort && (
        <select
          value={sort.value}
          onChange={(e) => sort.onChange(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          data-testid={`${testidPrefix}-sort-select`}
          aria-label={sort.label || "Sort by"}
        >
          {sort.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      )}
    </div>
  );
}
