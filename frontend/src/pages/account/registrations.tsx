import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { mockRegistrations } from '@/lib/mock/data';

export function AccountRegistrationsPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="attendee">
      <Heading className='mb-6'>{t('account.registrations.title')}</Heading>
      <Card>
        <CardContent>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead>
                <tr className='border-b border-border text-muted-foreground'>
                  <th className='pb-3 font-medium'>{t('account.registrations.eventHeader')}</th>
                  <th className='pb-3 font-medium'>{t('account.registrations.categoryHeader')}</th>
                  <th className='pb-3 font-medium'>{t('account.registrations.statusHeader')}</th>
                  <th className='pb-3 font-medium'>{t('account.registrations.dateHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {mockRegistrations.map((reg: any) => (
                  <tr key={reg.id} className='border-b border-border/50'>
                    <td className='py-3'>{reg.event?.title || '-'}</td>
                    <td className='py-3'>{reg.category?.name || '-'}</td>
                    <td className='py-3'><StatusBadge status={reg.status} /></td>
                    <td className='py-3 text-muted-foreground'>{reg.submittedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
