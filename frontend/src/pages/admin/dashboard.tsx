import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { StatCard } from '@/components/shared/stat-card';
import { DollarSign, Users, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { mockAdminStats } from '@/lib/mock/data';

export function AdminDashboardPage() {
  const { t } = useTranslation();

  const stats = [
    { label: t('admin.gmv'), value: `Rp ${mockAdminStats.gmv.toLocaleString('id-ID')}`, icon: DollarSign },
    { label: t('admin.platformRevenue'), value: `Rp ${mockAdminStats.platformRevenue.toLocaleString('id-ID')}`, icon: CreditCard },
    { label: t('admin.pendingOrgs'), value: String(mockAdminStats.pendingOrganizations), icon: AlertCircle },
    { label: t('admin.pendingEvents'), value: String(mockAdminStats.pendingEvents), icon: CheckCircle },
    { label: t('admin.openDisputes'), value: String(mockAdminStats.openDisputes), icon: Users },
  ];

  return (
    <DashboardShell role="admin">
      <Heading className='mb-6'>{t('admin.title')}</Heading>
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {stats.map((stat, i) => (
          <StatCard key={i} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>
    </DashboardShell>
  );
}
