import { getSupabaseClient } from './supabase'

async function getCurrentUserId(client) {
  const { data, error } = await client.auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error('Kamu harus login terlebih dahulu.')
  }

  return data.user.id
}

function normalizeBudgetPayload(values) {
  const category = String(values.category || '').trim()
  const limitAmount = Number(values.limitAmount)
  const period = values.period === 'weekly' || values.period === 'monthly' ? values.period : null

  if (!category) {
    throw new Error('Kategori budget wajib diisi.')
  }

  if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
    throw new Error('Limit amount harus berupa angka lebih dari 0.')
  }

  if (!period) {
    throw new Error('Period hanya boleh weekly atau monthly.')
  }

  if (!values.startDate || !values.endDate) {
    throw new Error('Start date dan end date wajib diisi.')
  }

  if (values.startDate > values.endDate) {
    throw new Error('End date tidak boleh lebih awal dari start date.')
  }

  return {
    category,
    limit_amount: limitAmount,
    period,
    start_date: values.startDate,
    end_date: values.endDate,
    status: 'active',
  }
}

function sumActualExpenseForBudget(budget, transactions) {
  return transactions.reduce((total, transaction) => {
    if (transaction.category !== budget.category) {
      return total
    }

    if (
      transaction.transaction_date < budget.start_date ||
      transaction.transaction_date > budget.end_date
    ) {
      return total
    }

    return total + Number(transaction.amount || 0)
  }, 0)
}

export async function getBudgetsWithSpending() {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data: budgets, error: budgetsError } = await client
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (budgetsError) {
    throw budgetsError
  }

  if (!budgets || budgets.length === 0) {
    return []
  }

  const categories = [...new Set(budgets.map((budget) => budget.category).filter(Boolean))]
  const startDate = budgets.reduce((earliest, budget) => {
    return budget.start_date < earliest ? budget.start_date : earliest
  }, budgets[0].start_date)
  const endDate = budgets.reduce((latest, budget) => {
    return budget.end_date > latest ? budget.end_date : latest
  }, budgets[0].end_date)

  let query = client
    .from('transactions')
    .select('id, category, amount, transaction_date')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)

  if (categories.length > 0) {
    query = query.in('category', categories)
  }

  const { data: transactions, error: transactionsError } = await query

  if (transactionsError) {
    throw transactionsError
  }

  return budgets.map((budget) => ({
    ...budget,
    actual_expense: sumActualExpenseForBudget(budget, transactions || []),
  }))
}

export async function createBudget(values) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)
  const payload = normalizeBudgetPayload(values)

  const { data, error } = await client
    .from('budgets')
    .insert({
      user_id: userId,
      ...payload,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateBudget(id, values) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)
  const payload = normalizeBudgetPayload(values)

  const { data, error } = await client
    .from('budgets')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteBudget(id) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { error } = await client
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}
