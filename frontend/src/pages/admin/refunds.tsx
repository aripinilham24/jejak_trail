import { useTranslation } from 'react-i18next';
import { Heading } from '@/components/ui/heading';
import { DataTable, type Column } from '@/components/ui/data-table';
import { mockRefunds } from '@/lib/mock/data';

const columns: Column[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'amount', header: 'Nominal' },
  { accessorKey: 'status', header: 'Status' },
];

export function AdminRefundsPage() {
  const { t } = useTranslation();

  return (
    <>
      <Heading className='mb-6'>{t('admin.refunds')}</Heading>
      <DataTable columns={columns} data={mockRefunds} />
    </>
  );
}
