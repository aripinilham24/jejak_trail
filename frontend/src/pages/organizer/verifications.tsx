import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { mockRegistrations } from '@/lib/mock/data';

const columns: Column[] = [
  { accessorKey: 'fullNameSnapshot', header: 'Peserta' },
  { accessorKey: 'event.title', header: 'Event' },
  { accessorKey: 'category.name', header: 'Kategori' },
  { accessorKey: 'status', header: 'Status Verifikasi', cell: (status: any) => <StatusBadge status={status} /> },
  {
    accessorKey: 'actions',
    header: 'Aksi',
    cell: () => (
      <div className='flex gap-2'>
        <Button variant='outline' size='sm' className='h-8 text-xs'>Setujui</Button>
        <Button variant='outline' size='sm' className='h-8 text-destructive'>Tolak</Button>
      </div>
    ),
  },
];

export function OrganizerVerificationsPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="organizer">
      <div className='flex flex-col gap-6'>
        <div className='flex items-center justify-between'>
          <Heading>{t('organizer.verifications.title')}</Heading>
          <div className='flex gap-2'>
            <Button variant='outline' size='sm'>Semua</Button>
            <Button variant='outline' size='sm'>Pending</Button>
          </div>
        </div>
        <DataTable columns={columns} data={mockRegistrations.filter((r: any) => r.status === 'pending_verification')} />
      </div>
    </DashboardShell>
  );
}
