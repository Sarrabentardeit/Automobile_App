import { apiFetch } from './api'
import type { MoneyIn, MoneyOut, TransactionFournisseur } from '../types/money'
import { MONEY_IN_TYPES, MONEY_OUT_CATEGORIES } from '../types/money'

function asLabels(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map(item => item.trim())
}

function mergeLabels(base: readonly string[], extras: string[]): string[] {
  const seen = new Set(base.map(label => label.toLowerCase()))
  const merged = [...base]
  for (const label of extras) {
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(label)
  }
  return merged
}

async function readSetting(token: string, key: string): Promise<unknown> {
  const res = await apiFetch<{ value: unknown }>(`/settings/${key}`, { token })
  return res?.value
}

export async function fetchMoneyIn(
  token: string,
  period?: { year: number; month: number }
): Promise<MoneyIn[]> {
  const list = await apiFetch<MoneyIn[]>('/money/in', {
    token,
    params: period ? { year: period.year, month: period.month } : undefined,
  })
  return Array.isArray(list) ? list : []
}

export async function fetchMoneyOut(
  token: string,
  period?: { year: number; month: number }
): Promise<MoneyOut[]> {
  const list = await apiFetch<MoneyOut[]>('/money/out', {
    token,
    params: period ? { year: period.year, month: period.month } : undefined,
  })
  return Array.isArray(list) ? list : []
}

export async function addMoneyIn(token: string, data: Omit<MoneyIn, 'id'>): Promise<MoneyIn> {
  return apiFetch<MoneyIn>('/money/in', { method: 'POST', token, body: data })
}

export async function addMoneyOut(token: string, data: Omit<MoneyOut, 'id' | 'sourceRef'>): Promise<MoneyOut> {
  return apiFetch<MoneyOut>('/money/out', { method: 'POST', token, body: data })
}

export async function updateMoneyIn(token: string, id: number, data: Partial<MoneyIn>): Promise<MoneyIn> {
  return apiFetch<MoneyIn>(`/money/in/${id}`, { method: 'PUT', token, body: data })
}

export async function updateMoneyOut(token: string, id: number, data: Partial<MoneyOut>): Promise<MoneyOut> {
  return apiFetch<MoneyOut>(`/money/out/${id}`, { method: 'PUT', token, body: data })
}

export async function loadInTypes(token: string): Promise<string[]> {
  const [managed, extra] = await Promise.all([
    readSetting(token, 'money_in_types'),
    readSetting(token, 'money_custom_in_types'),
  ])
  return asLabels(managed) ?? mergeLabels(MONEY_IN_TYPES, asLabels(extra) ?? [])
}

export async function saveInTypes(token: string, types: string[]): Promise<void> {
  await apiFetch('/settings/money_in_types', { method: 'PUT', token, body: { value: types } })
}

export async function loadOutCategories(token: string): Promise<string[]> {
  const [managed, extra] = await Promise.all([
    readSetting(token, 'money_out_categories'),
    readSetting(token, 'money_custom_out_categories'),
  ])
  return asLabels(managed) ?? mergeLabels(MONEY_OUT_CATEGORIES, asLabels(extra) ?? [])
}

export async function saveOutCategories(token: string, categories: string[]): Promise<void> {
  await apiFetch('/settings/money_out_categories', { method: 'PUT', token, body: { value: categories } })
}

export async function fetchTransactionsFournisseurs(
  token: string,
  period?: { year: number; month: number }
): Promise<TransactionFournisseur[]> {
  const list = await apiFetch<TransactionFournisseur[]>('/fournisseur-transactions', {
    token,
    params: period ? { year: period.year, month: period.month } : undefined,
  })
  return Array.isArray(list) ? list : []
}

export async function addTransactionFournisseur(
  token: string,
  data: Omit<TransactionFournisseur, 'id'>
): Promise<TransactionFournisseur> {
  return apiFetch<TransactionFournisseur>('/fournisseur-transactions', { method: 'POST', token, body: data })
}

export async function deleteTransactionFournisseur(token: string, id: number): Promise<void> {
  await apiFetch(`/fournisseur-transactions/${id}`, { method: 'DELETE', token })
}
