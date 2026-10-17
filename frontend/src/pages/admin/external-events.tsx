import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { DataTable, type Column } from '@/components/ui/data-table';
import { mockEvents } from '@/lib/mock/data';

const columns: Column[] = [
  { accessorKey: 'title', header: 'Event' },
  { accessorKey: 'externalUrl', header: 'URL Eksternal' },
  { accessorKey: 'status', header: 'Status' },
];

export function AdminExternalEventsPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="admin">
      <Heading className='mb-6'>{t('admin.externalEvents')}</Heading>
      <DataTable columns={columns} data={mockEvents.filter((e: any) => e.eventType === 'external')} />
    </DashboardShell>
  );
}
