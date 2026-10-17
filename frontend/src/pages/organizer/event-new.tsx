import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const EventFormSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  date: z.string().min(1),
  location: z.string().min(1),
  category: z.string().min(1),
  maxQuota: z.number().positive(),
  priceBase: z.number().positive(),
});

type EventFormValues = z.infer<typeof EventFormSchema>;

export function EventNewPage() {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      date: '',
      location: '',
      category: '',
      maxQuota: 0,
      priceBase: 0,
    },
  });

  async function onSubmit() {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
  }

  return (
    <DashboardShell role="organizer">
      <Heading className='mb-6'>{t('organizer.newEvent')}</Heading>
      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>{t('organizer.newEvent')}</CardTitle>
          <CardDescription>{t('organizer.newEventHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <div>
                <Label>{t('fields.name')}</Label>
                <Input {...form.register('name')} />
              </div>
              <div>
                <Label>{t('fields.slug')}</Label>
                <Input {...form.register('slug')} />
              </div>
              <div className='col-span-2'>
                <Label>{t('fields.description')}</Label>
                <Textarea {...form.register('description')} />
              </div>
            </div>
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <div>
                <Label>{t('fields.date')}</Label>
                <Input type='date' {...form.register('date')} />
              </div>
              <div>
                <Label>{t('fields.location')}</Label>
                <Input {...form.register('location')} />
              </div>
              <div>
                <Label>{t('fields.category')}</Label>
                <Select {...form.register('category')}>
                  <SelectTrigger>
                    <SelectValue placeholder='Pilih kategori' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='21K'>21K</SelectItem>
                    <SelectItem value='42K'>42K</SelectItem>
                    <SelectItem value='10K'>10K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('fields.maxQuota')}</Label>
                <Input type='number' {...form.register('maxQuota')} />
              </div>
              <div>
                <Label>{t('fields.price')}</Label>
                <Input type='number' {...form.register('priceBase')} />
              </div>
            </div>
            <CardFooter className='flex justify-end'>
              <Button type='button' variant='outline' onClick={() => form.reset()}>
                {t('actions.cancel')}
              </Button>
              <Button type='submit' disabled={submitting}>
                {submitting ? 'Menyimpan…' : t('actions.saveDraft')}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
