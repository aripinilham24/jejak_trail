import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { mockDisbursements } from '@/lib/mock/data';

export function OrganizerFinancePage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="organizer">
      <Heading className='mb-6'>{t('organizer.finance')}</Heading>
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        <StatCard label={t('organizer.collected')} value='Rp 150.000.000' trend={{ value: '+12%', positive: true }} />
        <StatCard label={t('organizer.disbursed')} value='Rp 80.000.000' trend={{ value: '+8%', positive: true }} />
        <StatCard label={t('organizer.held')} value='Rp 70.000.000' />
      </div>
      <div className='mt-6'>
        <DataTable
          columns={[
            { accessorKey: 'id', header: 'ID' },
            { accessorKey: 'amount', header: 'Jumlah' },
            { accessorKey: 'status', header: 'Status' },
          ]}
          data={mockDisbursements}
        />
      </div>
    </DashboardShell>
  );
}
