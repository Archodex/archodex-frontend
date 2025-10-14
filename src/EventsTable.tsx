import React, { useCallback, useContext, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  RowSelectionState,
  useReactTable,
} from '@tanstack/react-table';
import { edgeIdFromResourceIds, nodeIdFromResourceId, TZ_OFFSET } from './lib/utils';
import { Checkbox } from './components/ui/checkbox';
import { Button } from './components/ui/button';
import { ArrowUpDown, Info } from 'lucide-react';
import ResourceIcons from './components/ResourceIcons';
import ResourceLink from './components/ResourceLink';
import { QueryDataActions } from './hooks/useQueryData';
import QueryDataDispatchContext from './contexts/QueryDataDispatchContext';

export interface EventsTableProps {
  resourceEvents: ResourceEvent[];
  selectedEdges: Set<string>;
  showEvent: (resourceEvent: ResourceEvent) => void;
}

const EventsTable: React.FC<EventsTableProps> = ({ resourceEvents, selectedEdges, showEvent }) => {
  const queryDataDispatch = useContext(QueryDataDispatchContext);

  const rowSelection = useMemo(
    () =>
      [...selectedEdges].reduce<RowSelectionState>((rowSelection, edgeId) => {
        for (const event of resourceEvents) {
          if (edgeId === edgeIdFromResourceIds(event.principal, event.resource)) {
            const rowId = `${edgeIdFromResourceIds(event.principal, event.resource)}-${event.type}`;

            rowSelection[rowId] = true;

            return rowSelection;
          }
        }

        return rowSelection;
      }, {}),
    [resourceEvents, selectedEdges],
  );

  const table = useReactTable({
    data: resourceEvents,
    columns: [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
              onCheckedChange={(value) => {
                table.toggleAllPageRowsSelected(!!value);
              }}
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => {
                row.toggleSelected(!!value);
              }}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'info',
        header: () => <div className="flex justify-center">Details</div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              className="justify-self-center"
              onClick={(e) => {
                showEvent(row.original);
                e.stopPropagation();
              }}
            >
              <Info />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'principal',
        accessorKey: 'principal',
        header: ({ column }) => (
          <Button
            className="p-0"
            variant="ghost"
            onClick={() => {
              column.toggleSorting(column.getIsSorted() === 'asc');
            }}
          >
            Principal
            <ArrowUpDown />
          </Button>
        ),
        sortingFn: (rowA, rowB) =>
          nodeIdFromResourceId(rowA.original.principal).localeCompare(nodeIdFromResourceId(rowB.original.principal)),
        cell: ({ getValue }) => (
          <div className="h-full flex items-center">
            <ResourceIcons id={getValue<ResourceId>()} />
            <div className="flex items-center">
              <ResourceLink id={getValue<ResourceId>()} />
            </div>
          </div>
        ),
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: ({ column }) => (
          <Button
            className="p-0"
            variant="ghost"
            onClick={() => {
              column.toggleSorting(column.getIsSorted() === 'asc');
            }}
          >
            Type
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ getValue }) => (
          <>
            <span className="text-primary">–</span>
            {getValue()}
            <span className="text-primary">→</span>
          </>
        ),
      },
      {
        id: 'resource',
        accessorKey: 'resource',
        header: ({ column }) => (
          <Button
            className="p-0"
            variant="ghost"
            onClick={() => {
              column.toggleSorting(column.getIsSorted() === 'asc');
            }}
          >
            Resource
            <ArrowUpDown />
          </Button>
        ),
        sortingFn: (rowA, rowB) =>
          nodeIdFromResourceId(rowA.original.principal).localeCompare(nodeIdFromResourceId(rowB.original.principal)),
        cell: ({ getValue }) => (
          <div className="h-full flex items-center w-fit">
            <ResourceIcons id={getValue<ResourceId>()} />
            <div className="flex items-center">
              <ResourceLink id={getValue<ResourceId>()} />
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'first_seen_at',
        header: `First Seen (${TZ_OFFSET})`,
        sortingFn: 'datetime',
        cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
      },
      {
        accessorKey: 'last_seen_at',
        header: `Last Seen (${TZ_OFFSET})`,
        sortingFn: 'datetime',
        cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
      },
    ],
    initialState: { sorting: [{ id: 'principal', desc: false }] },
    state: { rowSelection },
    enableMultiRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => `${edgeIdFromResourceIds(row.principal, row.resource)}-${row.type}`,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: (updater) => {
      const newRowSelectionValue = updater instanceof Function ? updater(rowSelection) : updater;

      const selectedEvents = Object.entries(newRowSelectionValue)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_id, isSelected]) => isSelected)
        .map(([id]) => id);

      for (const eventId of selectedEvents) {
        const event = table.getRow(eventId).original;
        const edgeId = edgeIdFromResourceIds(event.principal, event.resource);

        if (!selectedEdges.has(edgeId)) {
          queryDataDispatch({ action: QueryDataActions.SelectEdge, edgeId });
        }
      }

      for (const row of table.getRowModel().rows) {
        const event = row.original;
        const edgeId = edgeIdFromResourceIds(event.principal, event.resource);

        if (selectedEdges.has(edgeId) && !newRowSelectionValue[row.id]) {
          queryDataDispatch({ action: QueryDataActions.DeselectEdge, edgeId });
        }
      }
    },
  });

  const scrollIntoView = useCallback((row: HTMLTableRowElement | null) => {
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  let firstSelectedRowSeen = false;

  return (
    <>
      <Table>
        <TableHeader className="sticky top-0 z-1 bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className={header.id === 'select' ? 'w-8' : ''}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getSortedRowModel().rows.map((row) => {
            let ref;
            if (row.getIsSelected() && !firstSelectedRowSeen) {
              ref = scrollIntoView;
              firstSelectedRowSeen = true;
            }

            return (
              <TableRow
                key={row.id}
                className="h-10"
                data-state={row.getIsSelected() ? 'selected' : undefined}
                onClick={() => {
                  row.toggleSelected();
                }}
                ref={ref}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="h-0 py-0 text-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
};

export default EventsTable;
