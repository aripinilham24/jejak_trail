import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { CalendarDays, MapPin, Ticket, DollarSign } from 'lucide-react';
import { mockRegistrations } from '@/lib/mock/data';

export function AccountRegistrationDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();

  const reg = mockRegistrations.find((r: any) => r.id === id);

  if (!reg) {
    return (
      <DashboardShell role="attendee">
        <Heading className='mb-6'>{t('account.registrationDetail.notFoundTitle')}</Heading>
        <p className='text-muted-foreground'>{t('account.registrationDetail.notFoundMessage')}</p>
        <Button variant='outline' className='mt-4' asChild>
          <Link to="/account/registrations">
            {t('account.registrationDetail.backButton')}
          </Link>
        </Button>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="attendee">
      <Heading className='mb-6'>{t('account.registrationDetail.title', { eventName: reg.event?.title || 'Event' })}</Heading>
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>{t('account.registrationDetail.eventInfo')}</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center gap-3'>
              <CalendarDays className='h-5 w-5 text-muted-foreground' />
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{t('account.registrationDetail.eventDateLabel')}</span>
                <span className='text-sm text-muted-foreground'>{reg.event?.eventStartAt || '-'}</span>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <MapPin className='h-5 w-5 text-muted-foreground' />
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{t('account.registrationDetail.eventLocationLabel')}</span>
                <span className='text-sm text-muted-foreground'>{reg.event?.locationName || '-'}</span>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Ticket className='h-5 w-5 text-muted-foreground' />
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{t('account.registrationDetail.categoryLabel')}</span>
                <span className='text-sm text-muted-foreground'>{reg.category?.name || '-'}</span>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <DollarSign className='h-5 w-5 text-muted-foreground' />
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{t('account.registrationDetail.priceLabel')}</span>
                <span className='text-sm text-muted-foreground'>{reg.category?.price?.toLocaleString('id-ID') || '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('account.registrationDetail.registrationInfo')}</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm'>{t('account.registrationDetail.statusLabel')}</span>
              <StatusBadge status={reg.status} />
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm'>{t('account.registrationDetail.paymentStatusLabel')}</span>
              <StatusBadge status={reg.payment?.status || 'pending'} />
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm'>{t('account.registrationDetail.submittedAtLabel')}</span>
              <span className='text-sm text-muted-foreground'>{reg.submittedAt}</span>
            </div>
            {reg.bibNumber && (
              <div className='flex items-center justify-between'>
                <span className='text-sm'>{t('account.registrationDetail.bibNumberLabel')}</span>
                <span className='font-mono text-sm font-semibold'>{reg.bibNumber}</span>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant='outline' className='w-full' asChild>
              <Link to="/account/registrations">
                {t('account.registrationDetail.backButton')}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  );
}
