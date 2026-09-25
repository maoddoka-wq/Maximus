import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '#components/ui/form';

const schema = z.object({ email: z.string().email('Saisissez une adresse e-mail valide.') });
type Values = z.infer<typeof schema>;

export function FormDemo() {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => undefined)} className="max-w-md space-y-6">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>E-mail professionnel</FormLabel>
            <FormControl><Input placeholder="vous@entreprise.fr" {...field} /></FormControl>
            <FormDescription>Utilisé pour les notifications MAXIMUS.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit">Valider</Button>
      </form>
    </Form>
  );
}