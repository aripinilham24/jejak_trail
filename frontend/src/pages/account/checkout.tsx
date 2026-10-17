
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mockRegistrations } from '@/lib/mock/data';
import { format } from 'date-fns';
import { DollarSign, CalendarDays, Ticket, MapPin } from 'lucide-react';

export function AccountCheckoutPage() {
  const { t } = useTranslation();
  const { id } = useParams();

  const registration = mockRegistrations.find((reg) => reg.id === id);

  if (!registration) {
    return (
      <DashboardShell role="attendee">
        <Heading className='mb-6'>{t('account.checkout.notFoundTitle')}</Heading>
        <p className='text-muted-foreground'>{t('account.checkout.notFoundMessage')}</p>
        <Button variant='outline' className='mt-4' asChild>
          <Link to="/account/registrations">
            {t('account.checkout.backToRegistrationsButton')}
          </Link>
        </Button>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="attendee">
      <Heading className='mb-6'>{t('account.checkout.title', { eventName: registration.event!.title }) }</Heading>
      <Card className='max-w-xl mx-auto'>
        <CardHeader>
          <CardTitle>{t('account.checkout.paymentDetailsTitle')}</CardTitle>
          <CardDescription>{t('account.checkout.paymentDetailsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 mb-6 md:grid-cols-2'>
            <div className='flex items-center gap-3'>
              <CalendarDays className='h-5 w-5 text-muted-foreground' />
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{t('account.checkout.eventDateLabel')}</span>
                <span>{format(new Date(registration.event!.eventStartAt), "PPpp")}</span>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <MapPin className='h-5 w-5 text-muted-foreground' />
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{t('account.checkout.eventLocationLabel')}</span>
                <span>{registration.event!.locationName}</span>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Ticket className='h-5 w-5 text-muted-foreground' />
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{t('account.checkout.ticketTypeLabel')}</span>
                <span>{registration.category!.name}</span>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <DollarSign className='h-5 w-5 text-muted-foreground' />
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{t('account.checkout.amountLabel')}</span>
                <span>{registration.category!.price.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4'>
            <div className='grid w-full max-w-sm items-center gap-1.5'>
              <Label htmlFor='cardNumber'>{t('account.checkout.cardNumberLabel')}</Label>
              <Input id='cardNumber' placeholder='**** **** **** ****' />
            </div>
            <div className='grid w-full max-w-sm items-center gap-1.5'>
              <Label htmlFor='cardExpiry'>{t('account.checkout.cardExpiryLabel')}</Label>
              <Input id='cardExpiry' placeholder='MM/YY' />
            </div>
            <div className='grid w-full max-w-sm items-center gap-1.5'>
              <Label htmlFor='cardCvc'>{t('account.checkout.cardCvcLabel')}</Label>
              <Input id='cardCvc' placeholder='CVC' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex justify-end'>
          <Button asChild>
            <Link to="#">
              {t('account.checkout.payButton')}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </DashboardShell>
  );
}
