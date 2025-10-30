import React from 'react';

import { useOutletContext, useRevalidator } from 'react-router';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TZ_OFFSET } from '@/lib/utils';
import { AccountRoutesContext } from '@/AccountRoutes';
import ReportApiKeyCreateForm from '@/components/ReportApiKeyCreateForm';
import ReportApiKeyCreateFormState from '@/components/ReportApiKeyCreateFormState';
import posthog from 'posthog-js';

interface ReportAPIKeysProps {
  keys: ReportAPIKey[];
}

const ReportAPIKeys: React.FC<ReportAPIKeysProps> = ({ keys }) => {
  const accountContext = useOutletContext<AccountRoutesContext>();
  const revalidator = useRevalidator();

  const [revokeKeyId, setRevokeKeyId] = React.useState<number | undefined>();

  const columnHelper = createColumnHelper<ReportAPIKey>();

  const table = useReactTable({
    data: keys,
    columns: [
      columnHelper.accessor('id', { header: 'ID' }),
      columnHelper.accessor('description', { header: 'Description' }),
      columnHelper.accessor('created_at', {
        header: `Created At (${TZ_OFFSET})`,
        sortingFn: 'datetime',
        cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
      }),
      columnHelper.display({
        id: 'revoke',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              aria-label="Revoke"
              onClick={() => {
                setRevokeKeyId(row.original.id);
              }}
            >
              <Trash />
            </Button>
          </div>
        ),
      }),
    ],
    initialState: { sorting: [{ id: 'created_at', desc: false }] },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const [reportApiKeyCreateFormState, setReportApiKeyCreateFormState] = React.useState(
    ReportApiKeyCreateFormState.InputDescription,
  );

  const handleNewReportAPIKeyDialogOnOpenChange = React.useCallback((open: boolean) => {
    setReportApiKeyCreateFormState(ReportApiKeyCreateFormState.InputDescription);

    if (open) {
      posthog.capture('report_api_key_create_dialog_opened');
    }
  }, []);

  const onRevokeReportAPIKey = async () => {
    if (!revokeKeyId) {
      console.error('onRevokeReportAPIKey called without an API key ID to revoke');
      return;
    }

    setRevokeKeyId(undefined);
    const deletingToast = toast({ title: 'Deleting report API key...', duration: Infinity });

    try {
      const res = await fetch(
        accountContext.apiUrl(`/account/${accountContext.account.id}/report_api_key/${String(revokeKeyId)}`),
        { method: 'DELETE' },
      );

      deletingToast.dismiss();

      if (res.ok) {
        toast({ title: 'Report API key revoked' });
        posthog.capture('report_api_key_revoked');
        void revalidator.revalidate();
      } else {
        posthog.captureException(new Error(`Failed to revoke report API key: ${res.statusText}`));
        console.error(`Failed to revoke report API key: ${res.statusText}`);
        toast({ title: 'Failed to revoke report API key', duration: Infinity, variant: 'destructive' });
      }
    } catch (err) {
      posthog.captureException(err);
      deletingToast.dismiss();
      console.error(`Failed to revoke report API key: ${String(err)}`);
      toast({ title: 'Failed to revoke report API key', duration: Infinity, variant: 'destructive' });
    }
  };

  return (
    <>
      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold first:mt-0 my-6">Report API Keys</h2>
      <div className="rounded-md border my-6">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getSortedRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center py-4">
        <Dialog onOpenChange={handleNewReportAPIKeyDialogOnOpenChange}>
          <DialogTrigger asChild>
            <Button>Create New API Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Report API Key</DialogTitle>
              <ReportApiKeyCreateForm
                reportApiKeyCreateFormState={reportApiKeyCreateFormState}
                setReportApiKeyCreateFormState={setReportApiKeyCreateFormState}
              />
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!revokeKeyId}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke Report API Key</AlertDialogTitle>
              <AlertDialogDescription>
                Please confirm that you want to revoke this report API key. This action cannot be reversed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRevokeKeyId(undefined);
                  }}
                >
                  Cancel
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  onClick={() => {
                    void onRevokeReportAPIKey();
                  }}
                >
                  Revoke
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default ReportAPIKeys;
