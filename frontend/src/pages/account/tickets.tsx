
import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import { mockTickets } from '@/lib/mock/data';

export function AccountTicketsPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="attendee">
      <Heading className='mb-6'>{t('account.tickets.title')}</Heading>
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {mockTickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader>
              <CardTitle>Tiket Digital</CardTitle>
            </CardHeader>
            <CardContent className='flex items-center gap-4'>
              <QrCode className='size-20' />
              <div className='flex flex-col gap-1'>
                <span className='font-mono text-sm'>{ticket.qrCode}</span>
                <span className='text-xs text-muted-foreground'>{ticket.status}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant='outline' className='w-full'>{t('account.tickets.viewButton')}</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
