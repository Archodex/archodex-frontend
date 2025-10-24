import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useOutletContext, useRevalidator } from 'react-router';
import { AccountRoutesContext } from '@/AccountRoutes';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Copy } from 'lucide-react';
import ReportApiKeyCreateFormState from './ReportApiKeyCreateFormState';

const REPORT_API_KEY_SKELETON_VALUE =
  'archodex_report_api_key_194387_CAESFWh0dHA6Ly9sb2NhbGhvc3Q6NTczMRoQ6SrmCoAK5tBO/R3hBDjq7yIMsiIlHuz4nZGcvuYDKhXfbUB6AcnMmyzNvn6+FbTrhkwiKRU=';

const CreateReportAPIKeySchema = z.object({ description: z.string() });
type CreateReportAPIKeySchema = z.infer<typeof CreateReportAPIKeySchema>;

interface ReportApiKeyCreateFormProps {
  reportApiKeyCreateFormState: ReportApiKeyCreateFormState;
  setReportApiKeyCreateFormState: React.Dispatch<React.SetStateAction<ReportApiKeyCreateFormState>>;
}

const ReportApiKeyCreateForm: React.FC<ReportApiKeyCreateFormProps> = ({
  reportApiKeyCreateFormState,
  setReportApiKeyCreateFormState,
}) => {
  const [newReportApiKeyValue, setNewReportApiKeyValue] = useState<string | undefined>();
  const createReportAPIKeyForm = useForm<CreateReportAPIKeySchema>({
    resolver: zodResolver(CreateReportAPIKeySchema),
    defaultValues: { description: 'General purpose key' },
  });
  const revalidator = useRevalidator();
  const accountContext = useOutletContext<AccountRoutesContext>();

  const onCreateReportAPIKeySubmit = useCallback(
    async ({ description }: CreateReportAPIKeySchema) => {
      setReportApiKeyCreateFormState(ReportApiKeyCreateFormState.DisplayKey);

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
    },
    [accountContext, revalidator, setReportApiKeyCreateFormState],
  );

  useEffect(() => {
    if (reportApiKeyCreateFormState === ReportApiKeyCreateFormState.InputDescription) {
      createReportAPIKeyForm.reset();
      setNewReportApiKeyValue(undefined);
    }
  }, [createReportAPIKeyForm, reportApiKeyCreateFormState]);

  return reportApiKeyCreateFormState === ReportApiKeyCreateFormState.InputDescription ? (
    <Form {...createReportAPIKeyForm}>
      <form
        className="space-y-8"
        onSubmit={
          createReportAPIKeyForm.handleSubmit(onCreateReportAPIKeySubmit) as (e?: React.BaseSyntheticEvent) => void
        }
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
  ) : (
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
  );
};

export default ReportApiKeyCreateForm;
