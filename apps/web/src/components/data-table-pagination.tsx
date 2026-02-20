interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  entityName?: string;
}

export function DataTablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  entityName = "results",
}: DataTablePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = Math.min((page - 1) * pageSize + 1, totalCount);
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {totalCount > 0 ? (
          <>
            Showing <span className="font-semibold text-foreground">{start} to {end}</span> of{" "}
            <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span> {entityName}
          </>
        ) : (
          "No results"
        )}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
