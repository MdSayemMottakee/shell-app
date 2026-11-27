import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, Td, Th } from './ui/table';
import { cn } from '../lib/cn';

export interface DataGridColumn<T> {
    id: string;
    header: string;
    accessor?: (row: T) => unknown;
    render?: (row: T) => React.ReactNode;
    filterable?: boolean;
}

export interface DataGridProps<T> {
    rows: T[];
    columns: DataGridColumn<T>[];
    total?: number;
    page?: number;
    pageSize?: number;
    onPageChange?: (page: number) => void;
    search?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    toolbar?: React.ReactNode;
}

function cellValue<T>(row: T, column: DataGridColumn<T>): unknown {
    if (column.accessor) {
        return column.accessor(row);
    }
    return (row as Record<string, unknown>)[column.id];
}

export function DataGrid<T>({
    rows,
    columns,
    total,
    page = 1,
    pageSize = 10,
    onPageChange,
    search = '',
    onSearchChange,
    searchPlaceholder = 'Search',
    emptyTitle = 'No records',
    emptyDescription = 'Nothing matches the current filters.',
    toolbar,
}: DataGridProps<T>) {
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            for (const col of columns) {
                const f = filters[col.id]?.trim().toLowerCase();
                if (f) {
                    const v = String(cellValue(row, col) ?? '').toLowerCase();
                    if (!v.includes(f)) {
                        return false;
                    }
                }
            }
            if (!q) {
                return true;
            }
            return columns.some((col) =>
                String(cellValue(row, col) ?? '')
                    .toLowerCase()
                    .includes(q),
            );
        });
    }, [rows, columns, filters, search]);

    const sorted = useMemo(() => {
        if (!sort) {
            return filtered;
        }
        const col = columns.find((c) => c.id === sort.id);
        if (!col) {
            return filtered;
        }
        const copy = [...filtered];
        copy.sort((a, b) => {
            const av = cellValue(a, col);
            const bv = cellValue(b, col);
            const as = av == null ? '' : String(av);
            const bs = bv == null ? '' : String(bv);
            return sort.dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
        });
        return copy;
    }, [filtered, columns, sort]);

    const count = total ?? sorted.length;
    const pageCount = Math.max(1, Math.ceil(count / pageSize));
    const safePage = Math.min(page, pageCount);
    const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

    const toggleSort = (id: string) => {
        setSort((prev) => {
            if (prev?.id !== id) {
                return { id, dir: 'asc' };
            }
            if (prev.dir === 'asc') {
                return { id, dir: 'desc' };
            }
            return null;
        });
    };

    const filterable = columns.filter((c) => c.filterable !== false);

    return (
        <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 px-6 py-3">
                <div className="relative min-w-[12rem] flex-1">
                    <Search
                        size={14}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        value={search}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="pl-8"
                    />
                </div>
                <Button
                    variant="secondary"
                    onClick={() => setFiltersOpen((o) => !o)}
                    aria-pressed={filtersOpen}
                >
                    <Filter size={14} />
                    Filters
                </Button>
                {toolbar}
            </div>
            {filtersOpen ? (
                <div className="grid gap-3 border-t border-border bg-muted/40 px-6 py-3 sm:grid-cols-3">
                    {filterable.map((col) => (
                        <label key={col.id} className="block text-xs text-muted-foreground">
                            {col.header}
                            <Input
                                className="mt-1"
                                value={filters[col.id] ?? ''}
                                onChange={(e) =>
                                    setFilters((prev) => ({ ...prev, [col.id]: e.target.value }))
                                }
                            />
                        </label>
                    ))}
                </div>
            ) : null}
            <div className="min-h-[12rem] overflow-x-auto border-t border-border">
                {paged.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1 px-6 py-16 text-center">
                        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
                        <p className="text-sm text-muted-foreground">{emptyDescription}</p>
                    </div>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                {columns.map((col) => (
                                    <Th key={col.id}>
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 font-medium text-muted-foreground"
                                            onClick={() => toggleSort(col.id)}
                                        >
                                            {col.header}
                                            {sort?.id === col.id ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                                        </button>
                                    </Th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map((row, i) => (
                                <tr key={i} className="hover:bg-muted/50">
                                    {columns.map((col) => (
                                        <Td key={col.id} className={cn(col.id === 'id' && 'font-mono text-xs')}>
                                            {col.render
                                                ? col.render(row)
                                                : String(cellValue(row, col) ?? '—')}
                                        </Td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </div>
            <div className="flex items-center justify-end gap-1 border-t border-border px-4 py-2 text-muted-foreground">
                <span className="mr-2 text-xs tabular-nums">
                    {count === 0 ? '0' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, count)}`} of {count}
                </span>
                <Button variant="ghost" aria-label="First page" disabled={safePage <= 1} onClick={() => onPageChange?.(1)}>
                    <ChevronsLeft size={16} />
                </Button>
                <Button variant="ghost" aria-label="Previous page" disabled={safePage <= 1} onClick={() => onPageChange?.(safePage - 1)}>
                    <ChevronLeft size={16} />
                </Button>
                <Button variant="ghost" aria-label="Next page" disabled={safePage >= pageCount} onClick={() => onPageChange?.(safePage + 1)}>
                    <ChevronRight size={16} />
                </Button>
                <Button variant="ghost" aria-label="Last page" disabled={safePage >= pageCount} onClick={() => onPageChange?.(pageCount)}>
                    <ChevronsRight size={16} />
                </Button>
            </div>
        </div>
    );
}
