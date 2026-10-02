import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { useTheme } from '../../contexts/ThemeContext'
import { SkeletonChart } from '../ui/Skeleton'

export default function MonthlyBarChart({ data, isLoading, title }) {
  const { theme } = useTheme()

  if (isLoading) {
    return <SkeletonChart />
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">{title || 'Bar Chart'}</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Tidak ada data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="font-bold text-slate-900 dark:text-white mb-4">{title || 'Bar Chart'}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
          <XAxis
            dataKey="month"
            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }}
            axisLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }}
          />
          <YAxis
            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }}
            axisLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }}
            tickFormatter={(value) => new Intl.NumberFormat('id-ID', {
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(value)}
          />
          <Tooltip
            formatter={(value, name) => [
              new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0,
              }).format(value),
              name === 'income' ? 'Pemasukan' : 'Pengeluaran',
            ]}
            contentStyle={{
              backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
              borderRadius: '8px',
              border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
              color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
            }}
          />
          <Legend
            formatter={(value) => value === 'income' ? '💰 Pemasukan' : '💸 Pengeluaran'}
            wrapperStyle={{ color: theme === 'dark' ? '#f1f5f9' : '#0f172a' }}
          />
          <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="income" />
          <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="expense" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}