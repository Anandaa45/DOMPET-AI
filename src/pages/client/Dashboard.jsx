import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBudgetsWithSpending } from '../../lib/budgets'
import { getSavingGoals } from '../../lib/savingGoals'
import { getCurrentUserTransactions, createTransaction } from '../../lib/transactions'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { SkeletonCard, SkeletonChart, SkeletonTable } from '../../components/ui/Skeleton'
import ExpensePieChart from '../../components/charts/ExpensePieChart'
import MonthlyBarChart from '../../components/charts/MonthlyBarChart'
import BudgetProgressChart from '../../components/charts/BudgetProgressChart'

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [savingGoals, setSavingGoals] = useState([])
  const [budgets, setBudgets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickForm, setQuickForm] = useState({
    type: 'expense',
    description: '',
    amount: '',
    category: 'Lainnya',
    transactionDate: new Date().toISOString().slice(0, 10),
  })
  const [isSaving, setIsSaving] = useState(false)
  const { theme } = useTheme()
  const { addToast } = useToast()

  useEffect(() => {
    async function loadDashboard() {
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
        addToast(err.message || 'Gagal memuat dashboard.', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [])

  async function handleQuickAdd(e) {
    e.preventDefault()
    if (!quickForm.description || !quickForm.amount) {
      addToast('Deskripsi dan jumlah harus diisi', 'error')
      return
    }

    setIsSaving(true)
    try {
      await createTransaction({
        type: quickForm.type,
        description: quickForm.description,
        amount: Number(quickForm.amount),
        category: quickForm.category,
        transaction_date: quickForm.transactionDate,
      })
      addToast('Transaksi berhasil ditambahkan!', 'success')
      setShowQuickAdd(false)
      setQuickForm({
        type: 'expense',
        description: '',
        amount: '',
        category: 'Lainnya',
        transactionDate: new Date().toISOString().slice(0, 10),
      })
      // Reload dashboard
      const data = await getCurrentUserTransactions()
      setTransactions(data)
    } catch (err) {
      addToast(err.message || 'Gagal menambahkan transaksi', 'error')
    } finally {
      setIsSaving(false)
    }
  }

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
      label: 'Total Pemasukan',
      value: dashboard.totalIncome,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/5',
      icon: '💰',
      detail: `${formatCurrency(dashboard.monthlyIncome)} bulan ini`,
    },
    {
      label: 'Total Pengeluaran',
      value: dashboard.totalExpense,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-500/5',
      icon: '💸',
      detail: `${formatCurrency(dashboard.monthlyExpense)} bulan ini`,
    },
    {
      label: 'Saldo',
      value: dashboard.balance,
      color: dashboard.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      bgColor: dashboard.balance >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/5' : 'bg-red-50 dark:bg-red-500/5',
      icon: '🏦',
      detail: dashboard.topExpenseCategory ? `Terbesar: ${dashboard.topExpenseCategory.category}` : '',
    },
    {
      label: 'Transaksi',
      value: transactions.length,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-500/5',
      icon: '📋',
      detail: `Total ${transactions.length} transaksi`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Dompet AI
          </p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Ringkasan transaksi manual dan aktivitas keuangan terbaru.
          </p>
        </div>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all"
        >
          <span>➕</span> Tambah Cepat
        </button>
      </section>

      {isLoading ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm ${card.bgColor} dark:bg-opacity-50`}
              key={card.label}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{card.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${card.color}`}>
                    {typeof card.value === 'number' ? formatCurrency(card.value) : card.value}
                  </p>
                  {card.detail && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{card.detail}</p>
                  )}
                </div>
                <span className="text-3xl">{card.icon}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {!isLoading && !dashboard.hasTransactions && (
        <section className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
          <p className="text-5xl mb-4">📭</p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Belum ada transaksi</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Klik tombol <strong>Tambah Cepat</strong> untuk menambahkan transaksi pertama kamu.
          </p>
        </section>
      )}

      {isLoading ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {/* Saving Goals Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">🎯 Target Tabungan</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {mainSavingGoal ? mainSavingGoal.title : 'Belum ada target aktif'}
                </h3>
              </div>
              <Link className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline" to="/saving-goals">
                Lihat Semua →
              </Link>
            </div>

            {mainSavingGoal ? (
              <div className="mt-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Terkumpul</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(mainSavingGoal.current_amount)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Target</p>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">
                      {formatCurrency(mainSavingGoal.target_amount)}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Progress</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{mainSavingGoal.progress}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
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

          {/* Budget Summary Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">📊 Status Budget</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  Ringkasan penggunaan budget
                </h3>
              </div>
              <Link className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline" to="/budgets">
                Lihat Semua →
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">Budget aktif</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{budgetSummary.active}</p>
              </div>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-4 text-center">
                <p className="text-xs text-amber-700 dark:text-amber-400">Hampir habis</p>
                <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">{budgetSummary.nearLimit}</p>
              </div>
              <div className="rounded-xl bg-red-50 dark:bg-red-500/10 p-4 text-center">
                <p className="text-xs text-red-700 dark:text-red-400">Terlewati</p>
                <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">{budgetSummary.exceeded}</p>
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
          <MonthlyBarChart
            data={dashboard.monthlyChart}
            isLoading={isLoading}
            title="Arus kas 6 bulan"
          />
          <ExpensePieChart
            data={dashboard.categoryChart}
            isLoading={isLoading}
            title="Kategori expense bulan ini"
          />
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

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">➕ Tambah Transaksi Cepat</h3>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setQuickForm({ ...quickForm, type: 'expense' })}
                  className={`rounded-xl border-2 px-4 py-3 font-semibold transition-all ${
                    quickForm.type === 'expense'
                      ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  💸 Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setQuickForm({ ...quickForm, type: 'income' })}
                  className={`rounded-xl border-2 px-4 py-3 font-semibold transition-all ${
                    quickForm.type === 'income'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  💰 Pemasukan
                </button>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Deskripsi
                </label>
                <input
                  type="text"
                  value={quickForm.description}
                  onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })}
                  placeholder="Contoh: Belanja bulanan"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Jumlah (Rp)
                </label>
                <input
                  type="number"
                  value={quickForm.amount}
                  onChange={(e) => setQuickForm({ ...quickForm, amount: e.target.value })}
                  placeholder="10000"
                  min="0"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Kategori
                </label>
                <select
                  value={quickForm.category}
                  onChange={(e) => setQuickForm({ ...quickForm, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="Makanan">🍔 Makanan</option>
                  <option value="Transportasi">🚗 Transportasi</option>
                  <option value="Belanja Harian">🛒 Belanja Harian</option>
                  <option value="Kesehatan">🏥 Kesehatan</option>
                  <option value="Pendidikan">📚 Pendidikan</option>
                  <option value="Tagihan">📄 Tagihan</option>
                  <option value="Hiburan">🎬 Hiburan</option>
                  <option value="Gaji">💼 Gaji</option>
                  <option value="Uang Jajan">💵 Uang Jajan</option>
                  <option value="Lainnya">📦 Lainnya</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={quickForm.transactionDate}
                  onChange={(e) => setQuickForm({ ...quickForm, transactionDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-xl bg-emerald-600 dark:bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-700 dark:hover:bg-emerald-400 disabled:opacity-50 transition-all"
              >
                {isSaving ? '⏳ Menyimpan...' : '✅ Simpan Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
