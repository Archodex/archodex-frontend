import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { z } from 'zod';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { FormEventHandler, useCallback, useState } from 'react';
import { accountsUrl } from './lib/utils';
import { useNavigate, useRevalidator } from 'react-router';
import { invalidateAccountsLoaderData } from './lib/accountsLoader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Input } from './components/ui/input';
import posthog, { Properties } from 'posthog-js';

const regions: readonly [string, ...string[]] = (import.meta.env.VITE_ARCHODEX_REGIONS?.split(',').sort() ?? [
  'us-west-2',
]) as [string, ...string[]];

const RegionEnum = z.enum(regions);
type RegionEnum = z.infer<typeof RegionEnum>;

const ManagedCreateAccountSchema = z.object({ region: RegionEnum });
type ManagedCreateAccountSchema = z.infer<typeof ManagedCreateAccountSchema>;

const SelfHostedCreateAccountSchema = z.object({ endpoint: z.string().url() });
type SelfHostedCreateAccountSchema = z.infer<typeof SelfHostedCreateAccountSchema>;

const AccountCreate: React.FC = () => {
  const [formId, setFormId] = useState<'managed' | 'self-hosted' | 'logging-only'>('managed');

  const managedForm = useForm<ManagedCreateAccountSchema>({
    resolver: zodResolver(ManagedCreateAccountSchema),
    defaultValues: { region: 'us-west-2' },
  });

  const selfHostedForm = useForm<SelfHostedCreateAccountSchema>({
    resolver: zodResolver(SelfHostedCreateAccountSchema),
    defaultValues: { endpoint: '' },
  });

  const [form, setForm] = useState<
    UseFormReturn<ManagedCreateAccountSchema> | UseFormReturn<SelfHostedCreateAccountSchema>
  >(formId === 'managed' ? managedForm : selfHostedForm);

  const [formDisabled, setFormDisabled] = useState(false);
  const [statusToast, setStatusToast] = useState<ReturnType<typeof toast> | undefined>();

  const revalidator = useRevalidator();
  const navigate = useNavigate();

  const onSubmit = useCallback<FormEventHandler>(
    (event) => {
      void form.handleSubmit(async (options: ManagedCreateAccountSchema | SelfHostedCreateAccountSchema) => {
        statusToast?.dismiss();
        setStatusToast(undefined);
        setFormDisabled(true);

        let toastTitle;
        if ('region' in options) {
          toastTitle = `Creating account in region ${options.region}...`;
        } else {
          toastTitle = `Creating self-hosted account at ${options.endpoint}...`;
        }

        const createStatusToast = toast({ title: toastTitle, duration: Infinity });

        let accountId: string;
        try {
          if ('region' in options) {
            accountId = await createManagedAccount(options);
          } else {
            accountId = await createSelfHostedAccount(options);
          }
        } catch (err) {
          console.error('Failed to create account:', err);

          posthog.captureException(err);

          createStatusToast.dismiss();

          const failedStatusToast = toast({
            title: `Account creation failed :(`,
            description: err instanceof Error ? err.message : 'Unknown error',
            duration: Infinity,
            variant: 'destructive',
          });
          setStatusToast(failedStatusToast);

          setFormDisabled(false);
          return;
        }

        posthog.group('account', accountId);

        const props: Properties = { accountId };
        if ('region' in options) {
          props.region = options.region;
        } else {
          props.endpoint = options.endpoint;
        }

        posthog.capture('account_created', props);

        // Tell react-router to refetch the accounts list when we navigate below
        invalidateAccountsLoaderData();
        void revalidator.revalidate();

        createStatusToast.dismiss();
        void navigate(`/${accountId}`);
      })(event);
    },
    [form, navigate, revalidator, statusToast],
  );

  return (
    <div className="flex h-screen w-full justify-center items-center">
      <Card className="w-full md:w-1/2 m-10">
        <CardHeader>
          <CardTitle>Create Archodex Account</CardTitle>
          <hr className="mt-2" />
        </CardHeader>
        <CardContent>
          <Tabs
            value={formId}
            onValueChange={(v) => {
              if (v !== 'managed' && v !== 'self-hosted' && v !== 'logging-only') {
                throw new Error('Invalid account creation form tab value');
              }

              setFormId(v);
              setForm(v === 'managed' ? managedForm : selfHostedForm);
            }}
          >
            <TabsList className="flex mb-6 self-center gap-4">
              <TabsTrigger value="managed" disabled={formDisabled}>
                Managed Account
              </TabsTrigger>
              <TabsTrigger value="self-hosted" disabled={formDisabled}>
                Self-Hosted Account
              </TabsTrigger>
              <TabsTrigger value="logging-only" disabled={formDisabled}>
                Logging-Only
              </TabsTrigger>
            </TabsList>
            <TabsContent value="managed">
              <p>
                Archodex-managed accounts process and store your data in a per-account isolated database in a locality
                of your choice. Your data will never leave your chosen locality.
              </p>
              <Form {...managedForm}>
                <form id="managed" onSubmit={onSubmit}>
                  <FormField
                    control={managedForm.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Location</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          {...field}
                          disabled={(field.disabled ?? false) || formDisabled}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a data location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RegionEnum.options.map((region) => (
                              <SelectItem key={region} value={region}>
                                AWS {region} region
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="self-hosted">
              <p>
                Self-hosted accounts are stored in an Archodex Service environment you maintain. To get started, see the{' '}
                <a
                  href={`https://${import.meta.env.VITE_ARCHODEX_DOMAIN ?? 'archodex.com'}/docs/self-host`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Self-Host Documentation
                </a>
                .
              </p>
              <Form {...selfHostedForm}>
                <form id="self-hosted" onSubmit={onSubmit}>
                  <FormField
                    control={selfHostedForm.control}
                    name="endpoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Self-Hosted Endpoint</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://<self-hosted-instance>:5732"
                            {...field}
                            disabled={(field.disabled ?? false) || formDisabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="logging-only">
              <p>
                The Archodex Agent can be used in <i>logging-only</i> mode. This enables using Archodex without worrying
                where your data may be sent, though the data won’t be aggregated across contexts, viewable in the
                Archodex dashboard, or analyzed for issues.
              </p>
              <p>
                To learn more, visit our{' '}
                <a
                  href={`https://${import.meta.env.VITE_ARCHODEX_DOMAIN ?? 'archodex.com'}/docs/getting-started/logging-only-mode`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Logging-Only documentation
                </a>
                .
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
        {formId !== 'logging-only' && (
          <CardFooter>
            <Button
              type="submit"
              form={formId}
              className="text-white dark:text-black"
              disabled={form.formState.disabled || formDisabled}
            >
              Create Account
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

const createManagedAccount = async (options: ManagedCreateAccountSchema) => {
  const response = await fetch(accountsUrl({ region: options.region }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });

  if (!response.ok) {
    let errorJson;
    try {
      errorJson = (await response.json()) as { message: string };
    } catch (err) {
      console.error('Failed to parse response body of account creation error:', err);
      throw new Error('Failed to create managed account record in global database: ' + response.statusText);
    }

    throw new Error('Failed to create managed account record in global database: ' + errorJson.message);
  }

  const { id } = (await response.json()) as AccountCreateResponse;

  return id;
};

const createSelfHostedAccount = async (options: SelfHostedCreateAccountSchema) => {
  const response = await fetch(accountsUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    let errorJson;
    try {
      errorJson = (await response.json()) as { message: string };
    } catch (err) {
      console.error('Failed to parse response body of account creation error:', err);
      throw new Error('Failed to create self-hosted account record in global database: ' + response.statusText);
    }

    throw new Error('Failed to create self-hosted account record in global database: ' + errorJson.message);
  }

  const { id } = (await response.json()) as AccountCreateResponse;

  let selfHostedResponse;
  try {
    selfHostedResponse = await fetch(accountsUrl({ endpoint: options.endpoint }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: id }),
    });
  } catch (err) {
    console.error('Failed to create self-hosted account at provided endpoint:', err);
    await cleanupFailedSelfHostedAccount(id);
    throw new Error(`Failed to create self-hosted account at provided endpoint: ${options.endpoint}`);
  }

  if (!selfHostedResponse.ok) {
    let errorJson;
    try {
      errorJson = (await selfHostedResponse.json()) as { message: string };
    } catch (err) {
      console.error('Failed to parse response body of self-hosted account creation error:', err);
      throw new Error('Failed to create self-hosted account at provided endpoint: ' + selfHostedResponse.statusText);
    }

    // Try to clean up global account record if we failed to create the account on the self-hosted instance
    await cleanupFailedSelfHostedAccount(id);

    throw new Error('Failed to create self-hosted account at provided endpoint: ' + errorJson.message);
  }

  return id;
};

const cleanupFailedSelfHostedAccount = async (accountId: string) => {
  let deleteResponse;
  try {
    deleteResponse = await fetch(accountsUrl({ accountId }), { method: 'DELETE' });
  } catch (err) {
    console.error(
      `Failed to delete global account record for account ${accountId} after self-hosted account creation failure: `,
      err,
    );
    return;
  }

  if (!deleteResponse.ok) {
    try {
      const errorJson = (await deleteResponse.json()) as { message: string };
      console.error(
        `Failed to delete global account record for account ${accountId} after self-hosted account creation failure: `,
        errorJson.message,
      );
    } catch (err) {
      console.error(
        `Failed to parse response body of deletion for account ${accountId} while cleaning up failed self-hosted account creation: `,
        err,
      );
    }
  }
};

export default AccountCreate;
