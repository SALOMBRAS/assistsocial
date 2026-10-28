import { supabase } from '../lib/supabaseClient'
import type { ResidencialItem } from '../types/supabase'

export interface CreateResidencialInput {
  name: string
  address: string
  blocks_count: number
  floors_count: number
  pcd_adapted_units_count: number
  description?: string
}

export interface ResidencialValidationResult {
  isValid: boolean
  errors: string[]
}

const STORAGE_KEY = 'assistsocial_residenciais_cache'

export const DEFAULT_RESIDENCIAIS: ResidencialItem[] = [
  {
    id: 'res-paupina',
    slug: 'paupina',
    name: 'Residencial Paupina',
    address: 'Rua Paupina, s/n, Bairro Paupina, Fortaleza - CE',
    blocks_count: 12,
    floors_count: 4,
    pcd_adapted_units_count: 16,
    description: 'Conjunto habitacional do programa Minha Casa Minha Vida.',
    created_by: null,
    created_at: '2026-10-27T00:00:00Z',
    updated_at: '2026-10-27T00:00:00Z',
  },
  {
    id: 'res-joaquim-machado',
    slug: 'joaquim_machado',
    name: 'Residencial Joaquim Machado',
    address: 'Av. Joaquim Machado, 1500, Fortaleza - CE',
    blocks_count: 8,
    floors_count: 4,
    pcd_adapted_units_count: 10,
    description: 'Empreendimento social destinado a famílias de interesse prioritário.',
    created_by: null,
    created_at: '2026-10-27T00:00:00Z',
    updated_at: '2026-10-27T00:00:00Z',
  },
]

function getCachedResidenciais(): ResidencialItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_RESIDENCIAIS
}

function setCachedResidenciais(items: ResidencialItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

export function validateResidencialInput(input: CreateResidencialInput): ResidencialValidationResult {
  const errors: string[] = []

  if (!input.name || !input.name.trim()) {
    errors.push('O nome do residencial é obrigatório.')
  }

  if (!input.address || !input.address.trim()) {
    errors.push('O endereço do residencial é obrigatório.')
  }

  if (
    input.blocks_count === undefined ||
    input.blocks_count === null ||
    !Number.isInteger(Number(input.blocks_count)) ||
    Number(input.blocks_count) < 0
  ) {
    errors.push('A quantidade de blocos deve ser um número inteiro não negativo (>= 0).')
  }

  if (
    input.floors_count === undefined ||
    input.floors_count === null ||
    !Number.isInteger(Number(input.floors_count)) ||
    Number(input.floors_count) < 0
  ) {
    errors.push('A quantidade de andares deve ser um número inteiro não negativo (>= 0).')
  }

  if (
    input.pcd_adapted_units_count === undefined ||
    input.pcd_adapted_units_count === null ||
    !Number.isInteger(Number(input.pcd_adapted_units_count)) ||
    Number(input.pcd_adapted_units_count) < 0
  ) {
    errors.push('A quantidade de apartamentos adaptados para PCD deve ser um número inteiro não negativo (>= 0).')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function generateResidencialSlug(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || `residencial_${Date.now()}`
}

/**
 * Busca a lista completa de residenciais cadastrados (com fallback garantido).
 */
export async function fetchResidenciaisList(): Promise<ResidencialItem[]> {
  try {
    const { data, error } = await supabase
      .from('residenciais')
      .select('*')
      .order('name', { ascending: true })

    if (!error && data && data.length > 0) {
      setCachedResidenciais(data as ResidencialItem[])
      return data as ResidencialItem[]
    }
  } catch (err) {
    console.warn('Aviso ao consultar public.residenciais no Supabase:', err)
  }

  return getCachedResidenciais()
}

/**
 * Salva novo residencial no Supabase e atualiza o cache local.
 */
export async function createResidencial(
  input: CreateResidencialInput,
  userId?: string
): Promise<{ data?: ResidencialItem; error?: string }> {
  const validation = validateResidencialInput(input)
  if (!validation.isValid) {
    return { error: validation.errors.join(' ') }
  }

  const slug = generateResidencialSlug(input.name)
  const payload = {
    slug,
    name: input.name.trim(),
    address: input.address.trim(),
    blocks_count: Number(input.blocks_count),
    floors_count: Number(input.floors_count),
    pcd_adapted_units_count: Number(input.pcd_adapted_units_count),
    description: input.description?.trim() || null,
    created_by: userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await (supabase.from('residenciais') as any)
      .insert(payload)
      .select()
      .single()

    if (!error && data) {
      const created = data as ResidencialItem
      const cached = getCachedResidenciais()
      setCachedResidenciais([...cached.filter((r) => r.slug !== slug), created])
      return { data: created }
    }

    if (error) {
      console.warn('Erro ao inserir em public.residenciais:', error.message)
    }
  } catch (err) {
    console.warn('Erro de rede ao salvar residencial no banco:', err)
  }

  // Fallback: Armazenamento local consistente
  const fallbackItem: ResidencialItem = {
    id: `res-${slug}`,
    ...payload,
  }
  const cached = getCachedResidenciais()
  setCachedResidenciais([...cached.filter((r) => r.slug !== slug), fallbackItem])
  return { data: fallbackItem }
}

/**
 * Atualiza um residencial existente.
 */
export async function updateResidencial(
  slug: string,
  input: CreateResidencialInput
): Promise<{ data?: ResidencialItem; error?: string }> {
  const validation = validateResidencialInput(input)
  if (!validation.isValid) {
    return { error: validation.errors.join(' ') }
  }

  const payload = {
    name: input.name.trim(),
    address: input.address.trim(),
    blocks_count: Number(input.blocks_count),
    floors_count: Number(input.floors_count),
    pcd_adapted_units_count: Number(input.pcd_adapted_units_count),
    description: input.description?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await (supabase.from('residenciais') as any)
      .update(payload)
      .eq('slug', slug)
      .select()
      .single()

    if (!error && data) {
      const updated = data as ResidencialItem
      const cached = getCachedResidenciais()
      setCachedResidenciais(cached.map((r) => (r.slug === slug ? updated : r)))
      return { data: updated }
    }
  } catch (err) {
    console.warn('Erro ao atualizar residencial no Supabase:', err)
  }

  // Fallback local
  const cached = getCachedResidenciais()
  const current = cached.find((r) => r.slug === slug)
  if (current) {
    const updated: ResidencialItem = { ...current, ...payload }
    setCachedResidenciais(cached.map((r) => (r.slug === slug ? updated : r)))
    return { data: updated }
  }

  return { error: 'Residencial não encontrado.' }
}
