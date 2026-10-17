import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { DataTable, type Column } from '@/components/ui/data-table';
import { mockAuditLogs } from '@/lib/mock/data';

const columns: Column[] = [
  { accessorKey: 'actorName', header: 'Aktor' },
  { accessorKey: 'action', header: 'Aksi' },
  { accessorKey: 'entityType', header: 'Entitas' },
];

export function AdminAuditPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="admin">
      <Heading className='mb-6'>{t('admin.auditLogs')}</Heading>
      <DataTable columns={columns} data={mockAuditLogs} />
    </DashboardShell>
  );
}
