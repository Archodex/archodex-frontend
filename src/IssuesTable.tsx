import React, { useCallback, useContext, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  RowSelectionState,
  useReactTable,
} from '@tanstack/react-table';
import { Checkbox } from './components/ui/checkbox';
import { Button } from './components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { mergeRefs } from './lib/utils';
import TutorialCallbacksContext from './components/Tutorial/CallbacksContext';
import { QueryDataActions } from './hooks/useQueryData';
import QueryDataDispatchContext from './contexts/QueryDataDispatchContext';
import { Issue } from './hooks/useQueryData/issues';

export interface IssuesTableProps {
  issues: Map<string, Issue>;
  selectedIssues: Set<string>;
}

const IssuesTable: React.FC<IssuesTableProps> = ({ issues, selectedIssues }) => {
  const queryDataDispatch = useContext(QueryDataDispatchContext);
  const { elementRef } = useContext(TutorialCallbacksContext).refs;

  const rowSelection = useMemo(
    () =>
      Array.from(selectedIssues.values()).reduce<RowSelectionState>((acc, issueId) => {
        acc[issueId] = true;
        return acc;
      }, {}),
    [selectedIssues],
  );

  const issuesArray = useMemo(() => Array.from(issues.values()), [issues]);

  const table = useReactTable({
    data: issuesArray,
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
        accessorKey: 'message',
        header: ({ column }) => (
          <Button
            className="p-0"
            variant="ghost"
            onClick={() => {
              column.toggleSorting(column.getIsSorted() === 'asc');
            }}
          >
            Issue
            <ArrowUpDown />
          </Button>
        ),
        sortingFn: (rowA, rowB) => rowA.original.id.localeCompare(rowB.original.id),
        cell: ({ row }) => row.original.message,
      },
    ],
    initialState: { sorting: [{ id: 'message', desc: false }] },
    state: { rowSelection },
    enableMultiRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: (updater) => {
      const newRowSelectionValue = updater instanceof Function ? updater(rowSelection) : updater;

      for (const issueId of selectedIssues.keys()) {
        if (!newRowSelectionValue[issueId]) {
          queryDataDispatch({ action: QueryDataActions.DeselectIssue, issueId });
        }
      }

      for (const [id, isSelected] of Object.entries(newRowSelectionValue)) {
        if (isSelected && !selectedIssues.has(id)) {
          queryDataDispatch({ action: QueryDataActions.SelectIssue, issueId: id });
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
            let scrollRef;
            if (row.getIsSelected() && !firstSelectedRowSeen) {
              scrollRef = scrollIntoView;
              firstSelectedRowSeen = true;
            }

            const tutorialSecretIssueHardcodedRef =
              row.id ===
              'hardcoded-secret-value-::GitHub Service::https://github.com::Organization::Archodex::Git Repository::microservices-demo::Blob::src/subscriptions/charge.js-::Secret Value::2659c91418643fa45351fc9cc8ee7df783c83d9f90999a4ad1babc834983451c'
                ? elementRef('prodStripeSecretIssueHardcoded')
                : undefined;

            const tutorialSecretIssueMultipleHeldsRef =
              row.id ===
              'multiple-helds-::Secret Value::2659c91418643fa45351fc9cc8ee7df783c83d9f90999a4ad1babc834983451c'
                ? elementRef('prodStripeSecretIssueMultipleHelds')
                : undefined;

            const tutorialSendGridSecretIssueRef =
              row.id ===
              'across-environments-::Kubernetes Cluster::d77d838b-bdca-419f-9a55-71d8a8c34439::Namespace::qa::Deployment::emailservice::Container::server-::Kubernetes Cluster::d77d838b-bdca-419f-9a55-71d8a8c34439::Namespace::vault::Service::vault::HashiCorp Vault Service::vault.vault::Secrets Engine Mount::secret::Secret::prod/sendgrid'
                ? elementRef('sendGridSecretIssue')
                : undefined;

            return (
              <TableRow
                key={row.id}
                className="h-10"
                data-state={row.getIsSelected() ? 'selected' : undefined}
                onClick={() => {
                  row.toggleSelected();
                }}
                ref={mergeRefs(
                  scrollRef,
                  tutorialSecretIssueHardcodedRef,
                  tutorialSecretIssueMultipleHeldsRef,
                  tutorialSendGridSecretIssueRef,
                )}
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

export default IssuesTable;
