import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { DataTable, type Column } from '@/components/ui/data-table';
import { mockUsers } from '@/lib/mock/data';

const columns: Column[] = [
  { accessorKey: 'fullName', header: 'Nama' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'status', header: 'Status' },
];

export function AdminUsersPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="admin">
      <Heading className='mb-6'>{t('admin.users')}</Heading>
      <DataTable columns={columns} data={mockUsers.slice(0, 10)} />
    </DashboardShell>
  );
}
