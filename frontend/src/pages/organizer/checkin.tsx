import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function OrganizerCheckinPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="organizer">
      <Heading className='mb-6'>{t('organizer.checkin')}</Heading>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>{t('organizer.scanTicket')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground'>{t('organizer.checkinHint')}</p>
          </CardContent>
          <CardFooter>
            <Button variant='default' className='w-full'>{t('actions.scan')}</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('organizer.offline')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground'>Mode offline aktif. Pemindaian disimpan lokal.</p>
          </CardContent>
          <CardFooter>
            <Link to='/organizer/participants'>
              <Button variant='outline' className='w-full'>{t('actions.more')}</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  );
}
