import { type ReactNode, useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type OnChangeFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  toolbar?: (table: ReturnType<typeof useReactTable<TData>>) => ReactNode;
  initialColumnFilters?: ColumnFiltersState;
  initialColumnVisibility?: VisibilityState;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  manualPagination?: boolean;
  manualSorting?: boolean;
  pageCount?: number;
  rowCount?: number;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  getRowId?: (row: TData) => string;
  paginationControls?: ReactNode;
  hideTable?: boolean;
  children?: ReactNode;
  variant?: "default" | "borderless";
}

export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  initialColumnFilters,
  initialColumnVisibility,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange: externalOnColumnVisibilityChange,
  manualPagination,
  manualSorting,
  pageCount,
  rowCount,
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
  rowSelection: externalRowSelection,
  onRowSelectionChange: externalOnRowSelectionChange,
  getRowId,
  paginationControls,
  hideTable,
  children,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialColumnFilters ?? []);
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<VisibilityState>(initialColumnVisibility ?? {});

  const sorting = manualSorting && externalSorting ? externalSorting : internalSorting;
  const onSortingChange = manualSorting && externalOnSortingChange ? externalOnSortingChange : setInternalSorting;

  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility;
  const onColumnVisibilityChange = externalOnColumnVisibilityChange ?? setInternalColumnVisibility;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(!manualSorting ? { getSortedRowModel: getSortedRowModel() } : {}),
    ...(!manualPagination ? { getFilteredRowModel: getFilteredRowModel() } : {}),
    onSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange,
    ...(externalOnRowSelectionChange ? { onRowSelectionChange: externalOnRowSelectionChange, enableRowSelection: true } : {}),
    ...(getRowId ? { getRowId } : {}),
    ...(manualPagination ? { manualPagination: true, pageCount, rowCount } : {}),
    ...(manualSorting ? { manualSorting: true } : {}),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      ...(externalRowSelection !== undefined ? { rowSelection: externalRowSelection } : {}),
    },
  });

  return (
    <div className="space-y-4">
      {toolbar && toolbar(table)}
      {hideTable ? (
        children
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {paginationControls && (
            <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4">
              {paginationControls}
            </div>
          )}
        </div>
      )}
      {hideTable && paginationControls}
    </div>
  );
}
