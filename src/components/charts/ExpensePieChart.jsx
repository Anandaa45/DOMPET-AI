import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useTheme } from '../../contexts/ThemeContext'
import { SkeletonChart } from '../ui/Skeleton'

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#14b8a6', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4']

export default function ExpensePieChart({ data, isLoading, title }) {
  const { theme } = useTheme()

  if (isLoading) {
    return <SkeletonChart />
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">{title || 'Pie Chart'}</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Tidak ada data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="font-bold text-slate-900 dark:text-white mb-4">{title || 'Pie Chart'}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              maximumFractionDigits: 0,
            }).format(value)}
            contentStyle={{
              backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
              borderRadius: '8px',
              border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
              color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}