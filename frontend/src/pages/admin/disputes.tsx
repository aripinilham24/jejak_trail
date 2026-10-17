import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { DataTable, type Column } from '@/components/ui/data-table';
import { mockDisputes } from '@/lib/mock/data';

const columns: Column[] = [
  { accessorKey: 'reporterName', header: 'Pelapor' },
  { accessorKey: 'disputeType', header: 'Tipe' },
  { accessorKey: 'status', header: 'Status' },
];

export function AdminDisputesPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="admin">
      <Heading className='mb-6'>{t('admin.disputes')}</Heading>
      <DataTable columns={columns} data={mockDisputes} />
    </DashboardShell>
  );
}
