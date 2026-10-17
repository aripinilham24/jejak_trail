import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { DataTable, type Column } from '@/components/ui/data-table';
import { mockOrganizations } from '@/lib/mock/data';

const columns: Column[] = [
  { accessorKey: 'name', header: 'Organisasi' },
  { accessorKey: 'verificationStatus', header: 'Status Verifikasi' },
  { accessorKey: 'city', header: 'Kota' },
];

export function AdminOrganizationsPage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="admin">
      <Heading className='mb-6'>{t('admin.organizations')}</Heading>
      <DataTable columns={columns} data={mockOrganizations} />
    </DashboardShell>
  );
}
