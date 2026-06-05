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
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadReport() {
      setError('')
      setIsLoading(true)

      try {
        const data = await getTransactionsByMonth(year, month)
        setTransactions(data)
      } catch (err) {
        setError(err.message || 'Gagal memuat laporan.')
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
    { label: 'Total pemasukan', value: report.totalIncome, color: 'text-emerald-700' },
    { label: 'Total pengeluaran', value: report.totalExpense, color: 'text-red-600' },
    { label: 'Saldo akhir bulan', value: report.balance, color: 'text-slate-950' },
    {
      label: 'Kategori expense terbesar',
      value: report.topExpenseCategory?.category || 'Belum ada',
      detail: report.topExpenseCategory ? formatCurrency(report.topExpenseCategory.amount) : 'Tidak ada expense',
      color: 'text-slate-950',
      isText: true,
    },
  ]

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Dompet AI
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">Reports</h2>
          <p className="mt-2 text-sm text-slate-600">
            Laporan bulanan berdasarkan transaksi asli dari Supabase.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Bulan</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {monthOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tahun</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {yearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {!isLoading && !error && !report.hasTransactions ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Belum ada transaksi pada bulan ini</h3>
          <p className="mt-2 text-sm text-slate-600">
            Pilih bulan lain atau tambahkan transaksi baru untuk melihat laporan.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={card.label}>
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${card.color}`}>
              {card.isText ? card.value : formatCurrency(card.value)}
            </p>
            {card.detail ? (
              <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
            ) : null}
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Pengeluaran per kategori</h3>
          <p className="text-sm text-slate-500">Distribusi expense pada bulan terpilih.</p>

          <div className="mt-5 h-80">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Memuat grafik...
              </div>
            ) : report.categoryChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
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
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Tren harian</h3>
          <p className="text-sm text-slate-500">Pemasukan dan pengeluaran per tanggal.</p>

          <div className="mt-5 h-80">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Memuat tren...
              </div>
            ) : (
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={report.trend}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Line dataKey="income" name="Income" stroke="#059669" strokeWidth={2} type="monotone" />
                  <Line dataKey="expense" name="Expense" stroke="#dc2626" strokeWidth={2} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">Ringkasan transaksi</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-4 font-medium">Tanggal</th>
                <th className="py-3 pr-4 font-medium">Deskripsi</th>
                <th className="py-3 pr-4 font-medium">Kategori</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Source</th>
                <th className="py-3 text-right font-medium">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan="6">
                    Memuat transaksi...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan="6">
                    Belum ada transaksi pada bulan terpilih.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr className="border-b border-slate-100" key={transaction.id}>
                    <td className="py-3 pr-4 text-slate-600">{transaction.transaction_date}</td>
                    <td className="py-3 pr-4 font-medium text-slate-950">{transaction.description}</td>
                    <td className="py-3 pr-4 text-slate-600">{transaction.category || '-'}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          transaction.type === 'income'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{transaction.source || '-'}</td>
                    <td className="py-3 text-right font-medium text-slate-950">
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
