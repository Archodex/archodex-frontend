import { z } from 'zod';

import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from './hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormMessage } from './components/ui/form';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';

const FormSchema = z.object({ query: z.string() });

const Query = () => {
  const form = useForm<z.infer<typeof FormSchema>>({ resolver: zodResolver(FormSchema), defaultValues: { query: '' } });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    const { id, dismiss, update } = toast({
      title: 'You submitted the following values:',
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });

    setTimeout(() => {
      update({ id, title: 'Query submitted!' });
    }, 1000);

    setTimeout(dismiss, 5000);
  }

  return (
    <div className="p-4 lg:p-8">
      <h2 className="text-2xl">Query</h2>
      <Card className="my-5">
        <CardHeader>
          <CardTitle>SQL Query</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="SELECT * from resource;" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
      </Card>
      <CardContent>{/* Results go here */}</CardContent>
    </div>
  );
};

export default Query;
