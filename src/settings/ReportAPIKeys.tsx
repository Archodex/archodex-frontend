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
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Trash } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

const REPORT_API_KEY_SKELETON_VALUE =
  'archodex_report_api_key_194387_CAESFWh0dHA6Ly9sb2NhbGhvc3Q6NTczMRoQ6SrmCoAK5tBO/R3hBDjq7yIMsiIlHuz4nZGcvuYDKhXfbUB6AcnMmyzNvn6+FbTrhkwiKRU=';

enum CreateReportAPIKeyDialogState {
  InputDescription,
  DisplayKey,
}

const CreateReportAPIKeySchema = z.object({ description: z.string() });
type CreateReportAPIKeySchema = z.infer<typeof CreateReportAPIKeySchema>;

interface ReportAPIKeysProps {
  keys: ReportAPIKey[];
}

const ReportAPIKeys: React.FC<ReportAPIKeysProps> = ({ keys }) => {
  const accountContext = useOutletContext<AccountRoutesContext>();
  const revalidator = useRevalidator();

  const [createReportApiKeyDialogState, setCreateReportApiKeyDialogState] = React.useState(
    CreateReportAPIKeyDialogState.InputDescription,
  );
  const [newReportApiKeyValue, setNewReportApiKeyValue] = React.useState<string | undefined>();
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

  const handleNewReportAPIKeyDialogOnOpenChange = () => {
    setCreateReportApiKeyDialogState(CreateReportAPIKeyDialogState.InputDescription);
    setNewReportApiKeyValue(undefined);
  };

  const createReportAPIKeyForm = useForm<CreateReportAPIKeySchema>({
    resolver: zodResolver(CreateReportAPIKeySchema),
    defaultValues: { description: 'General purpose key' },
  });

  const onCreateReportAPIKeySubmit = async ({ description }: CreateReportAPIKeySchema) => {
    setCreateReportApiKeyDialogState(CreateReportAPIKeyDialogState.DisplayKey);

    const body = {} as { description?: string };
    if (description) {
      body.description = description;
    }

    try {
      const res = await fetch(accountContext.apiUrl(`/account/${accountContext.account.id}/report_api_keys`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        toast({ title: 'Failed to create report API key', duration: Infinity, variant: 'destructive' });

        return;
      }

      const { report_api_key_value: reportKeyValue } = (await res.json()) as CreateReportAPIKeyResponse;

      setNewReportApiKeyValue(reportKeyValue);
      void revalidator.revalidate();
    } catch (err) {
      console.error(`Failed to create report API key: ${String(err)}`);
      toast({ title: 'Failed to create report API key', duration: Infinity, variant: 'destructive' });
    }
  };

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
        void revalidator.revalidate();
      } else {
        console.error(`Failed to revoke report API key: ${res.statusText}`);
        toast({ title: 'Failed to revoke report API key', duration: Infinity, variant: 'destructive' });
      }
    } catch (err) {
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
              <DialogDescription>
                {createReportApiKeyDialogState === CreateReportAPIKeyDialogState.InputDescription && (
                  <Form {...createReportAPIKeyForm}>
                    <form
                      className="space-y-8"
                      // eslint-disable-next-line @typescript-eslint/no-misused-promises
                      onSubmit={createReportAPIKeyForm.handleSubmit(onCreateReportAPIKeySubmit)}
                    >
                      <FormField
                        control={createReportAPIKeyForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full">
                        Create Key
                      </Button>
                    </form>
                  </Form>
                )}
                {createReportApiKeyDialogState === CreateReportAPIKeyDialogState.DisplayKey && (
                  <>
                    <p className="mt-6">Copy this report API key now. You will not be able to view this value again.</p>
                    <div className="flex mt-6">
                      {newReportApiKeyValue && (
                        <code className="flex-1 relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold break-all">
                          {newReportApiKeyValue}
                        </code>
                      )}
                      {!newReportApiKeyValue && (
                        <Skeleton className="flex-1 relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold break-all text-transparent">
                          {REPORT_API_KEY_SKELETON_VALUE}
                        </Skeleton>
                      )}
                      <Button
                        className="flex-none ml-1 h-auto w-auto p-1"
                        variant="outline"
                        size="icon"
                        disabled={!newReportApiKeyValue}
                        onClick={() => {
                          if (newReportApiKeyValue) void navigator.clipboard.writeText(newReportApiKeyValue);
                        }}
                      >
                        <Copy />
                      </Button>
                    </div>
                  </>
                )}
              </DialogDescription>
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
