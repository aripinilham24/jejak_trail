import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function OrganizerOnboardingPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="organizer">
      <Heading className='mb-6'>{t('organizer.onboarding')}</Heading>
      <Card>
        <CardHeader>
          <CardTitle>{t('organizer.onboardingStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground'>{t('organizer.reviewHint')}</p>
        </CardContent>
        <CardFooter>
          <Button variant='outline'>{t('organizer.approveAll')}</Button>
        </CardFooter>
      </Card>
    </DashboardShell>
  );
}
