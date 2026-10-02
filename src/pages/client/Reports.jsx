import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getTransactionsByMonth } from '../../lib/transactions'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonCard, SkeletonChart } from '../../components/ui/Skeleton'

const monthOptions = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
]

const chartColors = ['#dc2626', '#f97316', '#eab308', '#0891b2', '#4f46e5', '#9333ea']

export default function Reports() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { theme } = useTheme()
  const { addToast } = useToast()

  useEffect(() => {
    async function loadReport() {
      setError('')
      setIsLoading(true)

      try {
        const data = await getTransactionsByMonth(year, month)
        setTransactions(data)
      } catch (err) {
        addToast(err.message || 'Gagal memuat laporan.', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadReport()
  }, [month, year])

  const report = useMemo(() => {
    const total = {
      income: 0,
      expense: 0,
    }
    const categoryTotals = new Map()
    const daysInMonth = new Date(year, month, 0).getDate()
    const trend = Array.from({ length: daysInMonth }, (_, index) => ({
      day: String(index + 1),
      income: 0,
      expense: 0,
    }))

    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount)
      const date = new Date(transaction.transaction_date)
      const dayIndex = date.getDate() - 1

      if (transaction.type === 'income') {
        total.income += amount
        trend[dayIndex].income += amount
      } else {
        const category = transaction.category || 'Lainnya'

        total.expense += amount
        trend[dayIndex].expense += amount
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount)
      }
    })

    const categoryChart = Array.from(categoryTotals, ([category, amount]) => ({
      category,
      amount,
    })).sort((a, b) => b.amount - a.amount)

    return {
      totalIncome: total.income,
      totalExpense: total.expense,
      balance: total.income - total.expense,
      categoryChart,
      topExpenseCategory: categoryChart[0] || null,
      trend,
      hasTransactions: transactions.length > 0,
    }
  }, [transactions, month, year])

  const yearOptions = useMemo(() => {
    const currentYear = today.getFullYear()
    return Array.from({ length: 6 }, (_, index) => currentYear - index)
  }, [])

  function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(value))
  }

  const cards = [
    { label: 'Total pemasukan', value: report.totalIncome, color: 'text-emerald-600 dark:text-emerald-400', icon: '📈' },
    { label: 'Total pengeluaran', value: report.totalExpense, color: 'text-red-600 dark:text-red-400', icon: '📉' },
    { label: 'Saldo akhir bulan', value: report.balance, color: 'text-slate-900 dark:text-white', icon: '💰' },
    {
      label: 'Kategori expense terbesar',
      value: report.topExpenseCategory?.category || 'Belum ada',
      detail: report.topExpenseCategory ? formatCurrency(report.topExpenseCategory.amount) : 'Tidak ada expense',
      color: 'text-slate-900 dark:text-white',
      isText: true,
      icon: '🏷️',
    },
  ]

  function downloadCSV() {
    const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Type', 'Source', 'Nominal']
    const rows = transactions.map((t) => [
      t.transaction_date,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.category || '',
      t.type,
      t.source || '',
      t.amount,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `laporan-${month}-${year}.csv`
    link.click()
    URL.revokeObjectURL(url)
    addToast('Laporan CSV berhasil diunduh.', 'success')
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters and Export */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Dompet AI
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">📊 Laporan</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Laporan bulanan berdasarkan transaksi asli dari Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Bulan</label>
              <select
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {monthOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Tahun</label>
              <select
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              >
                {yearOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end pb-1">
            <button
              className="flex items-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors disabled:opacity-50"
              onClick={downloadCSV}
              disabled={!report.hasTransactions}
            >
              📥 Ekspor CSV
            </button>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      {isLoading ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm" key={card.label}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{card.icon}</span>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${card.color}`}>
                    {card.isText ? card.value : formatCurrency(card.value)}
                  </p>
                  {card.detail && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{card.detail}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {!isLoading && !report.hasTransactions ? (
        <section className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-8 text-center">
          <p className="text-4xl mb-4">📭</p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Belum ada transaksi pada bulan ini</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Pilih bulan lain atau tambahkan transaksi baru untuk melihat laporan.
          </p>
        </section>
      ) : null}

      {/* Charts */}
      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pengeluaran per Kategori</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Distribusi expense pada bulan terpilih.</p>
          </div>

          <div className="mt-5 h-80">
            {isLoading ? (
              <SkeletonChart />
            ) : report.categoryChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Belum ada data pengeluaran.
              </div>
            ) : (
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    data={report.categoryChart}
                    dataKey="amount"
                    innerRadius={58}
                    nameKey="category"
                    outerRadius={98}
                    paddingAngle={3}
                  >
                    {report.categoryChart.map((entry, index) => (
                      <Cell fill={chartColors[index % chartColors.length]} key={entry.category} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tren Harian</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Pemasukan dan pengeluaran per tanggal.</p>
          </div>

          <div className="mt-5 h-80">
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={report.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Line dataKey="income" name="Income" stroke="#059669" strokeWidth={2} type="monotone" dot={false} />
                  <Line dataKey="expense" name="Expense" stroke="#dc2626" strokeWidth={2} type="monotone" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Transaction Table */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">📋 Ringkasan Transaksi</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-4 font-medium">Tanggal</th>
                <th className="py-3 pr-4 font-medium">Deskripsi</th>
                <th className="py-3 pr-4 font-medium">Kategori</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Source</th>
                <th className="py-3 text-right font-medium">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td className="py-6 text-center text-slate-500 dark:text-slate-400" colSpan="6">
                    Memuat transaksi...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td className="py-6 text-center text-slate-500 dark:text-slate-400" colSpan="6">
                    Belum ada transaksi pada bulan terpilih.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50" key={transaction.id}>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{transaction.transaction_date}</td>
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{transaction.description}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{transaction.category || '-'}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        transaction.type === 'income'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                      }`}>
                        {transaction.type === 'income' ? '📈' : '📉'} {transaction.type}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{transaction.source || '-'}</td>
                    <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
