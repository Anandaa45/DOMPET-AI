import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  Legend,
} from 'recharts'
import { getBudgetsWithSpending } from '../../lib/budgets'
import { getSavingGoals } from '../../lib/savingGoals'
import { getCurrentUserTransactions } from '../../lib/transactions'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonCard, SkeletonChart, SkeletonTable } from '../../components/ui/Skeleton'

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [savingGoals, setSavingGoals] = useState([])
  const [budgets, setBudgets] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { theme } = useTheme()
  const { addToast } = useToast()

  useEffect(() => {
    async function loadDashboard() {
      setError('')
      setIsLoading(true)

      try {
        const [data, goalsData, budgetsData] = await Promise.all([
          getCurrentUserTransactions(),
          getSavingGoals(),
          getBudgetsWithSpending(),
        ])
        setTransactions(data)
        setSavingGoals(goalsData)
        setBudgets(budgetsData)
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
      hasTransactions: transactions.length > 0,
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

        if (isThisMonth) {
          initial.monthlyExpense += amount
          categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount)
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

  const mainSavingGoal = useMemo(() => {
    const activeGoal = savingGoals.find((goal) => goal.status === 'active') || null

    if (!activeGoal) {
      return null
    }

    const targetAmount = Number(activeGoal.target_amount || 0)
    const currentAmount = Number(activeGoal.current_amount || 0)
    const progress = targetAmount > 0
      ? Math.min(100, Math.round((currentAmount / targetAmount) * 100))
      : 0

    return {
      ...activeGoal,
      progress,
    }
  }, [savingGoals])

  const budgetSummary = useMemo(() => {
    return budgets.reduce(
      (summary, budget) => {
        const limitAmount = Number(budget.limit_amount || 0)
        const actualExpense = Number(budget.actual_expense || 0)
        const usage = limitAmount > 0 ? (actualExpense / limitAmount) * 100 : 0

        if (budget.status === 'active' || !budget.status) {
          summary.active += 1
        }

        if (usage >= 100) {
          summary.exceeded += 1
        } else if (usage >= 80) {
          summary.nearLimit += 1
        }

        return summary
      },
      { active: 0, nearLimit: 0, exceeded: 0 },
    )
  }, [budgets])

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
      color: 'text-slate-900 dark:text-white',
    },
    {
      label: 'Pemasukan bulan ini',
      value: dashboard.monthlyIncome,
      color: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      label: 'Pengeluaran bulan ini',
      value: dashboard.monthlyExpense,
      color: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Kategori expense terbesar',
      value: dashboard.topExpenseCategory
        ? dashboard.topExpenseCategory.category
        : 'Belum ada',
      detail: dashboard.topExpenseCategory
        ? formatCurrency(dashboard.topExpenseCategory.amount)
        : 'Tidak ada expense bulan ini',
      color: 'text-slate-900 dark:text-white',
      isText: true,
    },
  ]

  const pieColors = ['#ef4444', '#f97316', '#eab308', '#14b8a6', '#6366f1']

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Dompet AI
        </p>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">Dashboard</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Ringkasan transaksi manual dan aktivitas keuangan terbaru.
        </p>
      </section>

      {error ? (
        <p className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}

      {!isLoading && !error && !dashboard.hasTransactions ? (
        <section className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Belum ada transaksi</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Tambahkan transaksi pertama kamu di halaman Transactions untuk melihat saldo, grafik, dan ringkasan keuangan.
          </p>
        </section>
      ) : null}

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
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm" key={card.label}>
              <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className={`mt-2 text-2xl font-semibold ${card.color}`}>
                {card.isText ? card.value : formatCurrency(card.value)}
              </p>
              {card.detail ? (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{card.detail}</p>
              ) : null}
            </div>
          ))}
        </section>
      )}

      {isLoading ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Target Tabungan Utama</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {mainSavingGoal ? mainSavingGoal.title : 'Belum ada target aktif'}
                </h3>
              </div>
              <Link className="text-sm font-medium text-emerald-700 dark:text-emerald-400" to="/saving-goals">
                Lihat Target
              </Link>
            </div>

            {mainSavingGoal ? (
              <div className="mt-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Terkumpul</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(mainSavingGoal.current_amount)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Target</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(mainSavingGoal.target_amount)}
                    </p>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Progress</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">{mainSavingGoal.progress}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${mainSavingGoal.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                Buat target tabungan aktif untuk menampilkan progres di dashboard.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Status Budget</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  Ringkasan penggunaan budget
                </h3>
              </div>
              <Link className="text-sm font-medium text-emerald-700 dark:text-emerald-400" to="/budgets">
                Lihat Budget
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-slate-50 dark:bg-slate-700/50 p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">Budget aktif</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{budgetSummary.active}</p>
              </div>
              <div className="rounded-md bg-amber-50 dark:bg-amber-500/10 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">Hampir habis</p>
                <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-400">{budgetSummary.nearLimit}</p>
              </div>
              <div className="rounded-md bg-red-50 dark:bg-red-500/10 p-3">
                <p className="text-xs text-red-700 dark:text-red-400">Terlewati</p>
                <p className="mt-1 text-2xl font-semibold text-red-700 dark:text-red-400">{budgetSummary.exceeded}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {isLoading ? (
        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <SkeletonChart />
          <SkeletonChart />
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Arus kas 6 bulan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Income dan expense per bulan.</p>
              </div>
            </div>

            <div className="mt-5 h-80">
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
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Kategori expense bulan ini</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Lima kategori pengeluaran terbesar bulan ini.</p>

            <div className="mt-5 h-80">
              {dashboard.categoryChart.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  Belum ada expense bulan ini.
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
                    <span className="text-slate-700 dark:text-slate-300">{item.category}</span>
                  </div>
                  <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {isLoading ? (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Transaksi terbaru</h3>
          </div>
          <SkeletonTable rows={5} />
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Transaksi terbaru</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4 font-medium">Tanggal</th>
                  <th className="py-3 pr-4 font-medium">Deskripsi</th>
                  <th className="py-3 pr-4 font-medium">Kategori</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
                  <th className="py-3 text-right font-medium">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.latestTransactions.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-slate-500 dark:text-slate-400" colSpan="5">
                      Belum ada transaksi.
                    </td>
                  </tr>
                ) : (
                  dashboard.latestTransactions.map((transaction) => (
                    <tr className="border-b border-slate-100 dark:border-slate-800" key={transaction.id}>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{transaction.transaction_date}</td>
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{transaction.description}</td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{transaction.category || '-'}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            transaction.type === 'income'
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="py-3 text-right font-medium text-slate-900 dark:text-white">
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
