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

function normalizeSavingGoalPayload(values) {
  const title = String(values.title || '').trim()
  const targetAmount = Number(values.targetAmount)
  const currentAmount = Number(values.currentAmount || 0)

  if (!title) {
    throw new Error('Judul target wajib diisi.')
  }

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    throw new Error('Target amount harus berupa angka lebih dari 0.')
  }

  if (!Number.isFinite(currentAmount) || currentAmount < 0) {
    throw new Error('Current amount harus berupa angka minimal 0.')
  }

  return {
    title,
    description: values.description ? String(values.description).trim() : null,
    target_amount: targetAmount,
    current_amount: currentAmount,
    deadline: values.deadline || null,
    status: currentAmount >= targetAmount ? 'completed' : 'active',
  }
}

export async function getSavingGoals() {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { data, error } = await client
    .from('saving_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function createSavingGoal(values) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)
  const payload = normalizeSavingGoalPayload(values)

  const { data, error } = await client
    .from('saving_goals')
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

export async function updateSavingGoal(id, values) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)
  const payload = normalizeSavingGoalPayload(values)

  const { data, error } = await client
    .from('saving_goals')
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

export async function addSavingGoalAmount(goal, amount) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)
  const addedAmount = Number(amount)

  if (!Number.isFinite(addedAmount) || addedAmount <= 0) {
    throw new Error('Nominal tambah tabungan harus lebih dari 0.')
  }

  const currentAmount = Number(goal.current_amount || 0) + addedAmount
  const targetAmount = Number(goal.target_amount || 0)

  const { data, error } = await client
    .from('saving_goals')
    .update({
      current_amount: currentAmount,
      status: currentAmount >= targetAmount ? 'completed' : 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', goal.id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteSavingGoal(id) {
  const client = getSupabaseClient()
  const userId = await getCurrentUserId(client)

  const { error } = await client
    .from('saving_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}
