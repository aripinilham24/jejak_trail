import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import { mockUserProfile } from '@/lib/mock/data';

export function AccountProfilePage() {
  const { t } = useTranslation();
  const user = mockUserProfile;

  return (
    <DashboardShell role="attendee">
      <Heading className='mb-6'>{t('account.profile.title')}</Heading>
      <Card className='max-w-2xl mx-auto'>
        <CardHeader>
          <CardTitle>{t('account.profile.personalInfo')}</CardTitle>
        </CardHeader>
        <CardContent className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
          <div className='flex items-center gap-3'>
            <User className='h-5 w-5 text-muted-foreground' />
            <div className='flex flex-col'>
              <Label className='text-xs'>{t('account.profile.fullNameLabel')}</Label>
              <p className='text-sm font-medium'>{user.fullName}</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Mail className='h-5 w-5 text-muted-foreground' />
            <div className='flex flex-col'>
              <Label className='text-xs'>{t('account.profile.emailLabel')}</Label>
              <p className='text-sm font-medium'>{user.email}</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Phone className='h-5 w-5 text-muted-foreground' />
            <div className='flex flex-col'>
              <Label className='text-xs'>{t('account.profile.phoneLabel')}</Label>
              <p className='text-sm font-medium'>{user.phone}</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <MapPin className='h-5 w-5 text-muted-foreground' />
            <div className='flex flex-col'>
              <Label className='text-xs'>{t('account.profile.addressLabel')}</Label>
              <p className='text-sm font-medium'>{user.emergencyContactName}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant='outline'>{t('account.profile.saveButton')}</Button>
        </CardFooter>
      </Card>
    </DashboardShell>
  );
}
