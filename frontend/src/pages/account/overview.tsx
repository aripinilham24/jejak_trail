import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ElevationChart } from '@/components/shared/elevation-chart';
import { QuotaBar } from '@/components/shared/quota-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { Link } from 'react-router-dom';
import { CircleCheck, CircleDashed } from 'lucide-react';
import { mockRegistrations } from '@/lib/mock/data';

export function AccountOverviewPage() {
  const { t } = useTranslation();

  const stats = [
    { label: t('account.overview.totalEvents'), value: '5', hint: 'Event terdaftar' },
    { label: t('account.overview.approved'), value: '3', hint: 'Disetujui' },
    { label: t('account.overview.paid'), value: '2', hint: 'Lunas' },
    { label: t('account.overview.checkedIn'), value: '1', hint: 'Racepack diambil' },
  ];

  const eventProgress = [
    { label: 'Sundoro Trail', status: 'paid', progress: 100 },
    { label: 'Bromo Run', status: 'pending_verification', progress: 40 },
  ];

  return (
    <DashboardShell role="attendee">
      <Heading className='mb-6'>{t('account.overview.title')}</Heading>
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
        ))}
      </div>

      <div className='mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div>
          <Card className='h-full'>
            <CardHeader>
              <CardTitle>{t('account.overview.eventProgress.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {eventProgress.map((item) => (
                <div key={item.label} className='mb-4 last:mb-0'>
                  <div className='flex items-center justify-between text-xs mb-1'>
                    <span className='text-muted-foreground'>{item.label}</span>
                    <span className='font-medium'>{item.progress}%</span>
                  </div>
                  <QuotaBar filled={item.progress} quota={100} size='sm' />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className='h-full'>
            <CardHeader>
              <CardTitle>{t('account.overview.recentRegistrations.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {mockRegistrations.slice(0, 5).map((reg: any) => (
                <div key={reg.id} className='flex items-center justify-between gap-4 py-3 last:py-0'>
                  <div className='flex items-center gap-3'>
                    {reg.status === 'approved' && <CircleCheck className='h-5 w-5 text-green-500' />}
                    {reg.status === 'pending_verification' && <CircleDashed className='h-5 w-5 text-yellow-500' />}
                    <div className='flex flex-col'>
                      <span className='font-medium'>{reg.event?.title || 'Event'}</span>
                      <span className='text-sm text-muted-foreground'>{reg.submittedAt}</span>
                    </div>
                  </div>
                  <StatusBadge status={reg.status} />
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant='outline' className='w-full' asChild>
                <Link to='/account/registrations'>
                  {t('account.overview.recentRegistrations.viewAllButton')}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className='mt-6 grid grid-cols-1 gap-6 md:grid-cols-2'>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('account.overview.upcomingEvents.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-4'>
                <p className='text-muted-foreground'>{t('account.overview.upcomingEvents.noEvents')}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Link to='/account/registrations'>
                <Button variant='outline' className='w-full'>
                  {t('account.overview.upcomingEvents.viewAllButton')}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('account.overview.yourTickets.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-4'>
                <p className='text-muted-foreground'>{t('account.overview.yourTickets.noTickets')}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Link to='/account/tickets'>
                <Button variant='outline' className='w-full'>
                  {t('account.overview.yourTickets.viewAllButton')}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className='mt-6'>
        <Card>
          <CardHeader>
            <CardTitle>{t('account.overview.eventCalendar.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ElevationChart points={[]} />
          </CardContent>
          <CardFooter>
            <Link to='/account/registrations'>
              <Button variant='outline' className='w-full'>
                {t('account.overview.eventCalendar.viewCalendarButton')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  );
}
