import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { DataTable, type Column } from '@/components/ui/data-table';
import { mockEvents } from '@/lib/mock/data';

const columns: Column[] = [
  { accessorKey: 'title', header: 'Event' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'city', header: 'Kota' },
];

export function AdminEventsPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="admin">
      <Heading className='mb-6'>{t('admin.eventCuration')}</Heading>
      <DataTable columns={columns} data={mockEvents} />
    </DashboardShell>
  );
}
