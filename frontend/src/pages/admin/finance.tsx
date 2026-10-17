import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { StatCard } from '@/components/shared/stat-card';
import { mockFinance } from '@/lib/mock/data';

export function AdminFinancePage() {
  const { t } = useTranslation();

  return (
    <DashboardShell role="admin">
      <Heading className='mb-6'>{t('admin.finance')}</Heading>
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        <StatCard label={t('admin.collected')} value={mockFinance.totalIncome} trend={{ value: '+12%', positive: true }} />
        <StatCard label={t('admin.disbursed')} value={mockFinance.totalExpense} trend={{ value: '-8%', positive: false }} />
        <StatCard label={t('admin.held')} value={mockFinance.netProfit} />
      </div>
    </DashboardShell>
  );
}
