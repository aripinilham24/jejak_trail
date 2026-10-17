
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { PublicLayout } from '@/components/layout/public-layout';

export function RegisterOrganizerPage() {
  const { t } = useTranslation();

  return (
    <PublicLayout>
      <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">{t('auth.registerOrganizer.title')}</CardTitle>
            <CardDescription>{t('auth.registerOrganizer.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="organizationName">{t('auth.registerOrganizer.organizationNameLabel')}</Label>
                <Input id="organizationName" type="text" placeholder="PT. Maju Mundur" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">{t('auth.registerOrganizer.nameLabel')}</Label>
                <Input id="name" type="text" placeholder="John Doe" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t('auth.registerOrganizer.emailLabel')}</Label>
                <Input id="email" type="email" placeholder="m@example.com" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t('auth.registerOrganizer.passwordLabel')}</Label>
                <Input id="password" type="password" required />
              </div>
              <Button type="submit" className="w-full">
                {t('auth.registerOrganizer.createAccountButton')}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              {t('auth.registerOrganizer.haveAccount')}{' '}
              <Link to="/login" className="underline">
                {t('auth.registerOrganizer.signIn')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
