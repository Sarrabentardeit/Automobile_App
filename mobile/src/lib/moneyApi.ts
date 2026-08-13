import { apiFetch } from './api'
import type { MoneyIn, MoneyOut, TransactionFournisseur } from '../types/money'

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
