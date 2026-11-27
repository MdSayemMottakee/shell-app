const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
});

export function formatDate(value: string | number | Date | null | undefined): string {
    if (value == null || value === '') {
        return '—';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return dateFmt.format(date);
}

export function formatId(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }
    return value;
}
