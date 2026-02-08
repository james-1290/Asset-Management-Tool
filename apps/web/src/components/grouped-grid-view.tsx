import { type ReactNode, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface GroupedGridViewProps<T> {
  items: T[];
  groupByKey: keyof T & string;
  renderItem: (item: T) => ReactNode;
}

export function GroupedGridView<T>({ items, groupByKey, renderItem }: GroupedGridViewProps<T>) {
  const groups = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = String(item[groupByKey] ?? "Uncategorised");
      const arr = map.get(key);
      if (arr) arr.push(item);
      else map.set(key, [item]);
    }
    // Sort group names alphabetically
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items, groupByKey]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleGroup(name: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No results.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(([groupName, groupItems]) => {
        const isCollapsed = collapsed.has(groupName);
        return (
          <div key={groupName} className="rounded-md border">
            <Button
              variant="ghost"
              className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50"
              onClick={() => toggleGroup(groupName)}
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{groupName}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {groupItems.length}
              </Badge>
            </Button>
            {!isCollapsed && (
              <div className="grid grid-cols-1 gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groupItems.map(renderItem)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
