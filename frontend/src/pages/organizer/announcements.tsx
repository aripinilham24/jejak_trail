import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockBroadcasts } from '@/lib/mock/data';

export function OrganizerAnnouncementsPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="organizer">
      <Heading className='mb-6'>{t('organizer.announcements')}</Heading>
      <div className='space-y-4'>
        {mockBroadcasts.map((ann) => (
          <Card key={ann.id}>
            <CardHeader>
              <CardTitle>{ann.subject}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{ann.message}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>{t('organizer.addExternal')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground'>Buat pengumuman baru untuk peserta event Anda.</p>
          </CardContent>
          <CardFooter>
            <Button variant='outline' className='w-full'>{t('actions.add')}</Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  );
}
