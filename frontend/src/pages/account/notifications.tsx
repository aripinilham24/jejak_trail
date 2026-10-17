import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Bell } from 'lucide-react';
import { mockNotificationsSettings } from '@/lib/mock/data';

export function AccountNotificationsPage() {
  const { t } = useTranslation();

  const settings = mockNotificationsSettings;

  return (
    <DashboardShell role="attendee">
      <Heading className='mb-6'>{t('account.notifications.title')}</Heading>
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {settings.map((setting) => (
          <Card key={setting.id}>
            <CardHeader className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <Bell className='h-5 w-5 text-muted-foreground' />
                <div className='flex flex-col'>
                  <span className='font-medium'>{setting.label}</span>
                  <span className='text-xs text-muted-foreground'>{setting.key}</span>
                </div>
              </div>
              <Button variant='outline' size='sm'>{setting.enabled ? 'Aktif' : 'Nonaktif'}</Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
