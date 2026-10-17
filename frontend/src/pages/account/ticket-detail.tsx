
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import { mockTickets } from '@/lib/mock/data';

export function AccountTicketDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();

  const ticket = mockTickets.find((tkt) => tkt.id === id);

  if (!ticket) {
    return (
      <DashboardShell role="attendee">
        <Heading className='mb-6'>{t('account.ticketDetail.notFoundTitle')}</Heading>
        <p className='text-muted-foreground'>{t('account.ticketDetail.notFoundMessage')}</p>
        <Button variant='outline' className='mt-4' asChild>
          <Link to="/account/tickets">
            {t('account.ticketDetail.backButton')}
          </Link>
        </Button>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="attendee">
      <Heading className='mb-6'>{t('account.ticketDetail.title')}</Heading>
      <Card className='max-w-lg mx-auto'>
        <CardHeader className='flex flex-col items-center justify-center text-center'>
          <QrCode className='h-8 w-8 text-amber-500 mb-3' />
          <CardTitle className='text-2xl font-bold'>Tiket Digital</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col items-center justify-center gap-4 p-8'>
          <div className='p-4 bg-muted rounded-lg'>
            <QrCode className='size-32' />
          </div>
          <p className='font-mono text-lg'>{ticket.qrCode}</p>
        </CardContent>
        <CardFooter className='flex justify-end'>
          <Button variant='outline' asChild>
            <Link to="/account/tickets">
              {t('account.ticketDetail.backButton')}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </DashboardShell>
  );
}
