import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface Column {
  accessorKey: string
  header: string
  cell?: (value: any) => React.ReactNode
}

interface DataTableProps {
  columns: Column[]
  data: Record<string, any>[]
}

export function DataTable({ columns, data }: DataTableProps) {
  const [sortBy, setSortBy] = useState<{ id: string; desc: boolean } | null>(null)

  const sortedData = [...data].sort((a, b) => {
    if (!sortBy) return 0
    const aVal = a[sortBy.id]
    const bVal = b[sortBy.id]
    if (aVal < bVal) return sortBy.desc ? 1 : -1
    if (aVal > bVal) return sortBy.desc ? -1 : 1
    return 0
  })

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.accessorKey}
              className="cursor-pointer"
              onClick={() =>
                setSortBy({ id: column.accessorKey, desc: !sortBy || sortBy.id !== column.accessorKey })
              }
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((row, i) => (
          <TableRow key={i}>
            {columns.map((column) => (
              <TableCell key={column.accessorKey}>
                {column.cell ? column.cell(row[column.accessorKey]) : row[column.accessorKey]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
