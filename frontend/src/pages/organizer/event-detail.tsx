import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { CheckCircle, Clock } from 'lucide-react';
import { mockEvents, mockRegistrations } from '@/lib/mock/data';

export function OrganizerEventDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();

  const event = mockEvents.find((e) => e.id === id);
  const eventRegs = mockRegistrations.filter((r) => r.eventId === id);

  if (!event) {
    return (
      <DashboardShell role="organizer">
        <Heading className='mb-6'>Event tidak ditemukan</Heading>
      </DashboardShell>
    );
  }

  const columns: Column[] = [
    { accessorKey: 'fullNameSnapshot', header: 'Peserta' },
    { accessorKey: 'category.name', header: 'Kategori' },
    { accessorKey: 'status', header: 'Status', cell: (status: any) => <StatusBadge status={status} /> },
  ];

  return (
    <DashboardShell role="organizer">
      <Heading className='mb-6'>{event.title}</Heading>
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.about')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{event.description}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Statistik</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center gap-3'>
              <CheckCircle className='h-5 w-5 text-emerald-500' />
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{eventRegs.length}</span>
                <span className='text-xs text-muted-foreground'>Pendaftar</span>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Clock className='h-5 w-5 text-muted-foreground' />
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{event.eventStartAt}</span>
                <span className='text-xs text-muted-foreground'>Tanggal event</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground'>Ringkasan keuangan event.</p>
          </CardContent>
        </Card>
      </div>
      <div className='mt-6'>
        <Card>
          <CardHeader>
            <CardTitle>Daftar Peserta</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={eventRegs} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
