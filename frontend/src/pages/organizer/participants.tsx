import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { DataTable, type Column } from '@/components/ui/data-table';
import { mockRegistrations } from '@/lib/mock/data';

const columns: Column[] = [
  { accessorKey: 'fullNameSnapshot', header: 'Peserta' },
  { accessorKey: 'event.title', header: 'Event' },
  { accessorKey: 'category.name', header: 'Kategori' },
  { accessorKey: 'status', header: 'Status' },
];

export function OrganizerParticipantsPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="organizer">
      <Heading className='mb-6'>{t('organizer.participants')}</Heading>
      <DataTable columns={columns} data={mockRegistrations} />
    </DashboardShell>
  );
}
