import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getCurrentUserTransactions } from '../../lib/transactions'

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      setError('')
      setIsLoading(true)

      try {
        const data = await getCurrentUserTransactions()
        setTransactions(data)
      } catch (err) {
        setError(err.message || 'Gagal memuat dashboard.')
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const dashboard = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const initial = {
      totalIncome: 0,
      totalExpense: 0,
      monthlyIncome: 0,
      monthlyExpense: 0,
      latestTransactions: transactions.slice(0, 5),
      topExpenseCategory: null,
      monthlyChart: [],
      categoryChart: [],
    }

    const categoryTotals = new Map()
    const monthlyTotals = new Map()

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(currentYear, currentMonth - index, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      monthlyTotals.set(key, {
        key,
        month: date.toLocaleDateString('id-ID', { month: 'short' }),
        income: 0,
        expense: 0,
      })
    }

    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount)
      const date = new Date(transaction.transaction_date)
      const isThisMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthItem = monthlyTotals.get(monthKey)

      if (transaction.type === 'income') {
        initial.totalIncome += amount

        if (isThisMonth) {
          initial.monthlyIncome += amount
        }

        if (monthItem) {
          monthItem.income += amount
        }
      } else {
        const category = transaction.category || 'Lainnya'

        initial.totalExpense += amount
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount)

        if (isThisMonth) {
          initial.monthlyExpense += amount
        }

        if (monthItem) {
          monthItem.expense += amount
        }
      }
    })

    const categoryChart = Array.from(categoryTotals, ([category, amount]) => ({
      category,
      amount,
    })).sort((a, b) => b.amount - a.amount)

    return {
      ...initial,
      balance: initial.totalIncome - initial.totalExpense,
      monthlyChart: Array.from(monthlyTotals.values()),
      categoryChart: categoryChart.slice(0, 5),
      topExpenseCategory: categoryChart[0] || null,
    }
  }, [transactions])

  function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(value))
  }

  const cards = [
    {
      label: 'Saldo',
      value: dashboard.balance,
      color: 'text-slate-950',
    },
    {
      label: 'Pemasukan bulan ini',
      value: dashboard.monthlyIncome,
      color: 'text-emerald-700',
    },
    {
      label: 'Pengeluaran bulan ini',
      value: dashboard.monthlyExpense,
      color: 'text-red-600',
    },
    {
      label: 'Kategori expense terbesar',
      value: dashboard.topExpenseCategory
        ? dashboard.topExpenseCategory.category
        : 'Belum ada',
      detail: dashboard.topExpenseCategory
        ? formatCurrency(dashboard.topExpenseCategory.amount)
        : 'Tidak ada data expense',
      color: 'text-slate-950',
      isText: true,
    },
  ]

  const pieColors = ['#ef4444', '#f97316', '#eab308', '#14b8a6', '#6366f1']

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Dompet AI
        </p>
        <h2 className="text-3xl font-semibold text-slate-950">Dashboard</h2>
        <p className="text-sm text-slate-600">
          Ringkasan transaksi manual dan aktivitas keuangan terbaru.
        </p>
      </section>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
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

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Arus kas 6 bulan</h3>
              <p className="text-sm text-slate-500">Income dan expense per bulan.</p>
            </div>
          </div>

          <div className="mt-5 h-80">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Memuat grafik...
              </div>
            ) : (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={dashboard.monthlyChart}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="income" fill="#059669" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#dc2626" name="Expense" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Kategori expense</h3>
          <p className="text-sm text-slate-500">Lima kategori pengeluaran terbesar.</p>

          <div className="mt-5 h-80">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Memuat kategori...
              </div>
            ) : dashboard.categoryChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Belum ada data expense.
              </div>
            ) : (
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    data={dashboard.categoryChart}
                    dataKey="amount"
                    innerRadius={62}
                    nameKey="category"
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {dashboard.categoryChart.map((entry, index) => (
                      <Cell fill={pieColors[index % pieColors.length]} key={entry.category} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-2">
            {dashboard.categoryChart.map((item, index) => (
              <div className="flex items-center justify-between text-sm" key={item.category}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  <span className="text-slate-700">{item.category}</span>
                </div>
                <span className="font-medium text-slate-950">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">Transaksi terbaru</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-4 font-medium">Tanggal</th>
                <th className="py-3 pr-4 font-medium">Judul</th>
                <th className="py-3 pr-4 font-medium">Kategori</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 text-right font-medium">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan="5">
                    Memuat transaksi...
                  </td>
                </tr>
              ) : dashboard.latestTransactions.length === 0 ? (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan="5">
                    Belum ada transaksi.
                  </td>
                </tr>
              ) : (
                dashboard.latestTransactions.map((transaction) => (
                  <tr className="border-b border-slate-100" key={transaction.id}>
                    <td className="py-3 pr-4 text-slate-600">{transaction.transaction_date}</td>
                    <td className="py-3 pr-4 font-medium text-slate-950">{transaction.title}</td>
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
