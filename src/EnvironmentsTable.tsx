import React, { useCallback, useContext, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  RowSelectionState,
  useReactTable,
} from '@tanstack/react-table';
import { envColorByIndex, isDeeplyEqual, nodeIdFromResourceId } from './lib/utils';
import { Checkbox } from './components/ui/checkbox';
import { Button } from './components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { QueryDataActions } from './hooks/useQueryData';
import QueryDataDispatchContext from './contexts/QueryDataDispatchContext';

export interface EnvironmentsTableProps {
  environments: string[];
  resources: Resource[];
  selectedResources: Set<string>;
}

const isTaggedWithEnvironment = (resource: Resource, environment: string, resources: Resource[]): boolean => {
  if (resource.environments?.includes(environment)) {
    return true;
  }

  if (resource.id.length <= 1) {
    return false;
  }

  const parent = resources.find((r) => isDeeplyEqual(r.id, resource.id.slice(0, -1)));
  if (!parent) {
    throw new Error(`Parent resource not found for ${JSON.stringify(resource.id)} while checking for environment tags`);
  }

  return isTaggedWithEnvironment(parent, environment, resources);
};

const EnvironmentsTable: React.FC<EnvironmentsTableProps> = ({ environments, resources, selectedResources }) => {
  const queryDataDispatch = useContext(QueryDataDispatchContext);

  const environmentsWithResources = useMemo(() => {
    return environments.filter((env) => {
      const envResources = resources.filter((resource) => isTaggedWithEnvironment(resource, env, resources));
      return envResources.length > 0;
    });
  }, [environments, resources]);

  const rowSelection = environmentsWithResources.reduce<RowSelectionState>((rowSelection, env) => {
    const envResources = resources.filter((resource) => isTaggedWithEnvironment(resource, env, resources));

    rowSelection[env] =
      envResources.length > 0 &&
      envResources.every((resource) => selectedResources.has(nodeIdFromResourceId(resource.id)));

    return rowSelection;
  }, {});

  const table = useReactTable({
    data: environmentsWithResources,
    columns: [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value);
            }}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => {
              row.toggleSelected(!!value);
            }}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'name',
        accessorFn: (row) => row,
        header: ({ column }) => (
          <Button
            className="p-0"
            variant="ghost"
            onClick={() => {
              column.toggleSorting(column.getIsSorted() === 'asc');
            }}
          >
            Environment
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ getValue }) => (
          <>
            <span
              className={[
                'inline-block',
                'size-[20px]',
                'rounded-full',
                `bg-${envColorByIndex(environments.indexOf(getValue<string>()))}`,
                'justify-center',
                'text-center',
              ].join(' ')}
            >
              {getValue<string>().charAt(0).toUpperCase()}
            </span>
            &ensp;
            {getValue<string>()}
          </>
        ),
      },
    ],
    state: { rowSelection },
    enableMultiRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: (updater) => {
      const newRowSelectionValue = updater instanceof Function ? updater(rowSelection) : updater;

      for (const env of environmentsWithResources) {
        if (newRowSelectionValue[env] && !rowSelection[env]) {
          const envResources = resources.filter((resource) => isTaggedWithEnvironment(resource, env, resources));
          envResources.forEach((resource) => {
            queryDataDispatch({
              action: QueryDataActions.SelectResource,
              resourceId: nodeIdFromResourceId(resource.id),
              selectEdges: false,
            });
          });
        } else if (rowSelection[env] && !newRowSelectionValue[env]) {
          const envResources = resources.filter((resource) => isTaggedWithEnvironment(resource, env, resources));
          envResources.forEach((resource) => {
            queryDataDispatch({
              action: QueryDataActions.DeselectResource,
              resourceId: nodeIdFromResourceId(resource.id),
            });
          });
        }
      }
    },
  });

  const scrollIntoView = useCallback((row: HTMLTableRowElement | null) => {
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  let firstSelectedRowSeen = false;

  return (
    <Table className="table-fixed">
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
                <TableCell key={cell.id} className="h-0 py-0">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default EnvironmentsTable;
