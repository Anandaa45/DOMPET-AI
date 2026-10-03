import cron from 'node-cron'
import { getAdminSupabase } from '../supabase.js'
import { sendWhatsAppText } from '../whatsapp.js'
import { logSystemEvent } from '../logger.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

async function checkBudgetLimits() {
  const supabase = getAdminSupabase()
  const today = new Date()
  const currentMonth = today.toISOString().slice(0, 7) // YYYY-MM
  const currentWeekStart = new Date(today)
  currentWeekStart.setDate(today.getDate() - today.getDay())
  const currentWeekEnd = new Date(currentWeekStart)
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6)

  // Get all active budgets
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('id, user_id, category, limit_amount, period, start_date, end_date')
    .eq('status', 'active')
    .lte('start_date', today.toISOString().split('T')[0])
    .gte('end_date', today.toISOString().split('T')[0])

  if (error) {
    await logSystemEvent('scheduler_error', 'Failed to fetch budgets for limit check', { error: error.message })
    return
  }

  for (const budget of budgets) {
    // Calculate period start/end based on budget period
    let periodStart, periodEnd
    if (budget.period === 'monthly') {
      periodStart = `${currentMonth}-01`
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      periodEnd = nextMonth.toISOString().split('T')[0]
    } else {
      periodStart = currentWeekStart.toISOString().split('T')[0]
      periodEnd = currentWeekEnd.toISOString().split('T')[0]
    }

    // Get total expenses for this user/category/period
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', budget.user_id)
      .eq('type', 'expense')
      .eq('category', budget.category)
      .gte('transaction_date', periodStart)
      .lte('transaction_date', periodEnd)

    if (txError) {
      await logSystemEvent('scheduler_error', 'Failed to fetch transactions for budget check', {
        budget_id: budget.id,
        error: txError.message,
      })
      continue
    }

    const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const limitAmount = Number(budget.limit_amount)
    const percentage = (totalSpent / limitAmount) * 100

    // Get user's WhatsApp number
    const { data: profile } = await supabase
      .from('profiles')
      .select('whatsapp_number, full_name')
      .eq('id', budget.user_id)
      .single()

    if (!profile?.whatsapp_number) continue

    // Alert at 80%, 90%, 100% thresholds
    if (percentage >= 100) {
      await sendWhatsAppText(
        profile.whatsapp_number,
        `⚠️ *BUDGET TERLAMPAUI*\n\nKategori: ${budget.category}\nBatas: ${formatCurrency(limitAmount)}\nTerpakai: ${formatCurrency(totalSpent)} (${percentage.toFixed(0)}%)\n\nKamu sudah melebihi batas budget ${budget.period} untuk kategori ini.`,
      )
      await logSystemEvent('budget_alert', 'Budget limit exceeded', {
        budget_id: budget.id,
        user_id: budget.user_id,
        percentage: percentage.toFixed(0),
      })
    } else if (percentage >= 90) {
      await sendWhatsAppText(
        profile.whatsapp_number,
        `⚠️ *PERINGATAN BUDGET 90%*\n\nKategori: ${budget.category}\nBatas: ${formatCurrency(limitAmount)}\nTerpakai: ${formatCurrency(totalSpent)} (${percentage.toFixed(0)}%)\n\nHati-hati, budget ${budget.period} hampir habis.`,
      )
      await logSystemEvent('budget_warning', 'Budget at 90% limit', {
        budget_id: budget.id,
        user_id: budget.user_id,
        percentage: percentage.toFixed(0),
      })
    } else if (percentage >= 80) {
      await sendWhatsAppText(
        profile.whatsapp_number,
        `📊 *INFO BUDGET 80%*\n\nKategori: ${budget.category}\nBatas: ${formatCurrency(limitAmount)}\nTerpakai: ${formatCurrency(totalSpent)} (${percentage.toFixed(0)}%)\n\nBudget ${budget.period} sudah mencapai 80%.`,
      )
      await logSystemEvent('budget_info', 'Budget at 80% limit', {
        budget_id: budget.id,
        user_id: budget.user_id,
        percentage: percentage.toFixed(0),
      })
    }
  }
}

async function checkBillDueDates() {
  // For now, we'll check for recurring expenses that might be bills
  // In the future, a dedicated bills table would be better
  const supabase = getAdminSupabase()
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  // Check for transactions that might be recurring bills (same merchant, same amount, monthly)
  // This is a simplified approach - a proper bills table would be better
  const { data: recentExpenses, error } = await supabase
    .from('transactions')
    .select('user_id, merchant_name, amount, transaction_date, description')
    .eq('type', 'expense')
    .not('merchant_name', 'is', null)
    .gte('transaction_date', new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split('T')[0])

  if (error) {
    await logSystemEvent('scheduler_error', 'Failed to fetch transactions for bill check', { error: error.message })
    return
  }

  // Group by user and merchant to find potential recurring bills
  const userMerchants = {}
  for (const tx of recentExpenses) {
    const key = `${tx.user_id}|${tx.merchant_name}`
    if (!userMerchants[key]) {
      userMerchants[key] = []
    }
    userMerchants[key].push(tx)
  }

  for (const [key, transactions] of Object.entries(userMerchants)) {
    if (transactions.length < 2) continue

    // Check if amounts are similar (within 10%) and dates are roughly monthly
    const amounts = transactions.map(t => Number(t.amount))
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const similarAmounts = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.15)

    if (!similarAmounts) continue

    // Check if last transaction was roughly a month ago
    const lastTx = transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))[0]
    const lastDate = new Date(lastTx.transaction_date)
    const daysSinceLast = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24))

    // If it's been 28-32 days, likely a monthly bill due soon
    if (daysSinceLast >= 28 && daysSinceLast <= 32) {
      const [userId] = key.split('|')
      const { data: profile } = await supabase
        .from('profiles')
        .select('whatsapp_number, full_name')
        .eq('id', userId)
        .single()

      if (!profile?.whatsapp_number) continue

      await sendWhatsAppText(
        profile.whatsapp_number,
        `📅 *PENGINGAT TAGIHAN*\n\nMerchant: ${lastTx.merchant_name}\nEstimasi: ${formatCurrency(avgAmount)}\nTerakhir bayar: ${lastDate.toLocaleDateString('id-ID')}\n\nTagihan bulanan kemungkinan jatuh tempo hari ini/besok.`,
      )
      await logSystemEvent('bill_reminder', 'Monthly bill reminder sent', {
        user_id: userId,
        merchant: lastTx.merchant_name,
        estimated_amount: avgAmount,
      })
    }
  }
}

async function checkSavingGoalsDeadlines() {
  const supabase = getAdminSupabase()
  const today = new Date()
  const in3Days = new Date(today)
  in3Days.setDate(in3Days.getDate() + 3)
  const in7Days = new Date(today)
  in7Days.setDate(in7Days.getDate() + 7)

  const { data: goals, error } = await supabase
    .from('saving_goals')
    .select('id, user_id, title, target_amount, current_amount, deadline, status')
    .eq('status', 'active')
    .not('deadline', 'is', null)
    .lte('deadline', in7Days.toISOString().split('T')[0])

  if (error) {
    await logSystemEvent('scheduler_error', 'Failed to fetch saving goals for deadline check', { error: error.message })
    return
  }

  for (const goal of goals) {
    const deadline = new Date(goal.deadline)
    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
    const remaining = Number(goal.target_amount) - Number(goal.current_amount)
    const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100

    const { data: profile } = await supabase
      .from('profiles')
      .select('whatsapp_number, full_name')
      .eq('id', goal.user_id)
      .single()

    if (!profile?.whatsapp_number) continue

    if (daysLeft <= 0) {
      // Deadline passed
      await sendWhatsAppText(
        profile.whatsapp_number,
        `⏰ *TARGET TABUNGAN JATUH TEMPO*\n\nTarget: ${goal.title}\nTarget: ${formatCurrency(goal.target_amount)}\nTerkumpul: ${formatCurrency(goal.current_amount)} (${progress.toFixed(0)}%)\nKekurangan: ${formatCurrency(remaining)}\n\nDeadline sudah lewat (${deadline.toLocaleDateString('id-ID')}).`,
      )
      await logSystemEvent('saving_goal_deadline', 'Saving goal deadline passed', {
        goal_id: goal.id,
        user_id: goal.user_id,
      })
    } else if (daysLeft <= 3) {
      // 3 days left
      await sendWhatsAppText(
        profile.whatsapp_number,
        `⏳ *TARGET TABUNGAN ${daysLeft} HARI LAGI*\n\nTarget: ${goal.title}\nTarget: ${formatCurrency(goal.target_amount)}\nTerkumpul: ${formatCurrency(goal.current_amount)} (${progress.toFixed(0)}%)\nKekurangan: ${formatCurrency(remaining)}\n\nDeadline: ${deadline.toLocaleDateString('id-ID')}. Yuk tambah tabungan!`,
      )
      await logSystemEvent('saving_goal_reminder', 'Saving goal 3 days reminder', {
        goal_id: goal.id,
        user_id: goal.user_id,
        days_left: daysLeft,
      })
    } else if (daysLeft <= 7) {
      // 7 days left
      await sendWhatsAppText(
        profile.whatsapp_number,
        `📅 *TARGET TABUNGAN ${daysLeft} HARI LAGI*\n\nTarget: ${goal.title}\nTarget: ${formatCurrency(goal.target_amount)}\nTerkumpul: ${formatCurrency(goal.current_amount)} (${progress.toFixed(0)}%)\nKekurangan: ${formatCurrency(remaining)}\n\nDeadline: ${deadline.toLocaleDateString('id-ID')}.`,
      )
      await logSystemEvent('saving_goal_reminder', 'Saving goal 7 days reminder', {
        goal_id: goal.id,
        user_id: goal.user_id,
        days_left: daysLeft,
      })
    }
  }
}

async function runAllChecks() {
  await logSystemEvent('scheduler_run', 'Running scheduled reminder checks')
  await Promise.all([
    checkBudgetLimits(),
    checkBillDueDates(),
    checkSavingGoalsDeadlines(),
  ])
  await logSystemEvent('scheduler_run', 'Completed scheduled reminder checks')
}

export function startScheduler() {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[Scheduler] Running daily checks at 9:00 AM')
    await runAllChecks()
  })

  // Also run every 6 hours for more frequent budget checks
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Scheduler] Running 6-hour budget checks')
    await checkBudgetLimits()
  })

  console.log('[Scheduler] Started - Daily at 9:00 AM, Budget checks every 6 hours')
}

export { runAllChecks, checkBudgetLimits, checkBillDueDates, checkSavingGoalsDeadlines }