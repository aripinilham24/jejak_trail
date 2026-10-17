
import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload } from 'lucide-react';
import { mockDocuments } from '@/lib/mock/data';

export function AccountDocumentsPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="attendee">
      <Heading className='mb-6'>{t('account.documents.title')}</Heading>
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {mockDocuments.map((doc) => (
          <Card key={doc.id}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>{doc.title}</CardTitle>
              <FileText className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{doc.type}</div>
              <p className='text-xs text-muted-foreground'>
                {t('account.documents.uploaded', { date: doc.uploadedAt })}
              </p>
              <Button variant='outline' size='sm' className='mt-4'>
                {t('account.documents.downloadButton')}
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card className='flex flex-col items-center justify-center p-6 text-center'>
          <Upload className='h-12 w-12 text-muted-foreground mb-4' />
          <CardTitle className='text-lg'>{t('account.documents.uploadNewDocument')}</CardTitle>
          <CardDescription className='mt-2'>{t('account.documents.uploadDescription')}</CardDescription>
          <Button className='mt-4'>{t('account.documents.uploadButton')}</Button>
        </Card>
      </div>
    </DashboardShell>
  );
}
