import type { ReactNode } from 'react';

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-scroll">
      <table className="data-table w-full min-w-[680px] text-left text-sm">
        <thead className="bg-[hsl(var(--muted)/.55)] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><tr>{headers.map((header) => <th key={header} className="px-5 py-3 font-bold">{header}</th>)}</tr></thead>
        <tbody className="divide-y">{rows.map((row, rowIndex) => <tr data-testid={`table-row-${rowIndex}`} key={rowIndex} className="transition hover:bg-[hsl(var(--muted)/.35)]">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-5 py-4">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}