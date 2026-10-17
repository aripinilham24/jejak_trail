import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { mockUserProfile } from '@/lib/mock/data';

export function OrganizerProfilePage() {
  const { t } = useTranslation();
  const user = mockUserProfile;

  return (
    <DashboardShell role="organizer">
      <Heading className='mb-6'>{t('organizer.profile')}</Heading>
      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>{t('organizer.profile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-3'>
            <Label className='text-xs'>{t('fields.fullName')}</Label>
            <p className='text-sm font-medium'>{user.fullName}</p>
          </div>
          <div className='flex items-center gap-3 mt-4'>
            <Label className='text-xs'>{t('fields.email')}</Label>
            <p className='text-sm font-medium'>{user.email}</p>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
