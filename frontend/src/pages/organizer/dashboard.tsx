import { useTranslation } from 'react-i18next';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Heading } from '@/components/ui/heading';
import { StatCard } from '@/components/shared/stat-card';
import { DollarSign, Users, CreditCard, CheckCircle } from 'lucide-react';
import { mockOrganizerStats } from '@/lib/mock/data';

export function OrganizerDashboardPage() {
  const { t } = useTranslation();

  const stats = [
    { label: t('organizer.collected'), value: `Rp ${mockOrganizerStats.money.collected.toLocaleString('id-ID')}`, icon: DollarSign },
    { label: t('organizer.disbursed'), value: `Rp ${mockOrganizerStats.money.disbursed.toLocaleString('id-ID')}`, icon: CreditCard },
    { label: t('organizer.held'), value: `Rp ${mockOrganizerStats.money.held.toLocaleString('id-ID')}`, icon: CheckCircle },
    { label: t('organizer.pendingVerification'), value: String(mockOrganizerStats.registrationsByCategory.length), icon: Users },
  ];

  return (
    <DashboardShell role="organizer">
      <Heading className='mb-6'>{t('organizer.title')}</Heading>
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {stats.map((stat, i) => (
          <StatCard key={i} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>
    </DashboardShell>
  );
}
