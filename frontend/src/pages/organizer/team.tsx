import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { DataTable, type Column } from '@/components/ui/data-table';
import { mockTeam } from '@/lib/mock/data';

const columns: Column[] = [
  { accessorKey: 'name', header: 'Nama' },
  { accessorKey: 'role', header: 'Peran' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'status', header: 'Status' },
];

export function OrganizerTeamPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="organizer">
      <Heading className='mb-6'>{t('organizer.team')}</Heading>
      <DataTable columns={columns} data={mockTeam} />
    </DashboardShell>
  );
}
