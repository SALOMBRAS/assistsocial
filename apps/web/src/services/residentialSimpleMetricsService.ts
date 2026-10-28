/**
 * AssistSocial - Residential Simple Mode Metrics Service
 * Agregação quantitativa de indicadores com privacidade estrita (LGPD).
 * Não armazena nem manipula nomes, CPFs ou dados individualizados de moradores.
 */

import { supabase } from '../lib/supabaseClient'
import type { Database } from '../types/supabase'

export type ResidentialSimpleMetricsRow = Database['public']['Tables']['residential_simple_metrics']['Row']

export interface ResidentialSimpleMetrics {
  id?: string
  residencial_id?: string
  residencial_slug: string
  // Ocupação e Vagas
  total_capacity: number | null
  occupied_units: number | null
  available_units: number | null
  pcd_adapted_units: number | null
  // Documentação
  pending_documents_count: number | null
  regular_documents_count: number | null
  dossiers_no_pending_count: number | null
  dossiers_with_pending_count: number | null
  dossiers_resubmitted_search_count: number | null
  no_show_count: number | null
  dossiers_excluded_count: number | null
  dossiers_compliant_count: number | null
  dossiers_non_compliant_count: number | null
  dossiers_batched_count: number | null
  // Outros
  proxies_needed_count: number | null
  notes?: string | null
  custom_metrics?: Record<string, unknown>
  last_updated_by?: string | null
  last_updated_by_name?: string | null
  created_at?: string
  updated_at?: string
}

export interface MetricsHistoryEntry {
  id: string
  recorded_at: string
  updated_by: string | null
  updated_by_name: string | null
  reason: string | null
  metrics_snapshot: Record<string, unknown>
}

export interface ValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Validação de integridade e consistência dos indicadores simples.
 * Não substitui nem altera silenciosamente os valores digitados.
 */
export function validateSimpleMetrics(data: Partial<ResidentialSimpleMetrics>): {
  isValid: boolean
  errors: string[]
  warnings: string[]
  issues: ValidationIssue[]
} {
  const issues: ValidationIssue[] = []

  const numericFields: Array<{ key: keyof ResidentialSimpleMetrics; label: string }> = [
    { key: 'total_capacity', label: 'Capacidade total' },
    { key: 'occupied_units', label: 'Unidades ocupadas' },
    { key: 'available_units', label: 'Vagas disponíveis' },
    { key: 'pcd_adapted_units', label: 'Apartamentos adaptados PCD' },
    { key: 'pending_documents_count', label: 'Documentação pendente' },
    { key: 'regular_documents_count', label: 'Documentação regular' },
    { key: 'dossiers_no_pending_count', label: 'Dossiês sem pendência' },
    { key: 'dossiers_with_pending_count', label: 'Dossiês com pendência' },
    { key: 'dossiers_resubmitted_search_count', label: 'Reenviados para pesquisa' },
    { key: 'no_show_count', label: 'Não compareceram' },
    { key: 'dossiers_excluded_count', label: 'Dossiês excluídos' },
    { key: 'dossiers_compliant_count', label: 'Dossiês conformes' },
    { key: 'dossiers_non_compliant_count', label: 'Dossiês inconformes' },
    { key: 'dossiers_batched_count', label: 'Dossiês loteados' },
    { key: 'proxies_needed_count', label: 'Necessitam de procuração' },
  ]

  for (const { key, label } of numericFields) {
    const val = data[key]
    if (val !== null && val !== undefined) {
      if (typeof val === 'number') {
        if (val < 0) {
          issues.push({
            field: key,
            message: `${label} não pode ser um valor negativo.`,
            severity: 'error',
          })
        }
        if (!Number.isInteger(val)) {
          issues.push({
            field: key,
            message: `${label} deve ser um número inteiro.`,
            severity: 'error',
          })
        }
      } else {
        issues.push({
          field: key,
          message: `${label} deve ser um número válido.`,
          severity: 'error',
        })
      }
    }
  }

  // Verificações de consistência lógica (apenas avisos compreensíveis, sem mutação silenciosa)
  const total = typeof data.total_capacity === 'number' ? data.total_capacity : null
  const occupied = typeof data.occupied_units === 'number' ? data.occupied_units : null
  const available = typeof data.available_units === 'number' ? data.available_units : null

  if (total !== null && occupied !== null && occupied > total) {
    issues.push({
      field: 'occupied_units',
      message: `A quantidade ocupada (${occupied}) é maior que a capacidade total cadastrada (${total}).`,
      severity: 'warning',
    })
  }

  if (total !== null && occupied !== null && available !== null) {
    const sum = occupied + available
    if (sum !== total) {
      issues.push({
        field: 'available_units',
        message: `A soma de ocupados (${occupied}) e vagas disponíveis (${available}) resulta em ${sum}, divergindo da capacidade total informada (${total}).`,
        severity: 'warning',
      })
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').map((i) => i.message)
  const warnings = issues.filter((i) => i.severity === 'warning').map((i) => i.message)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    issues,
  }
}

/**
 * Sugestão de cálculo de vagas livres com base na capacidade e ocupação.
 * Apenas sugere o valor, nunca substitui automaticamente o que o usuário digitou.
 */
export function calculateSuggestedVacancies(
  total: number | null | undefined,
  occupied: number | null | undefined
): number | null {
  if (typeof total === 'number' && typeof occupied === 'number' && total >= 0 && occupied >= 0) {
    return Math.max(0, total - occupied)
  }
  return null
}

const LOCAL_STORAGE_PREFIX = 'assistsocial_simple_metrics_'

/**
 * Salva snapshot no armazenamento local como fallback e para hidratação imediata
 */
function cacheMetricsLocally(slug: string, metrics: ResidentialSimpleMetrics): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${slug}`, JSON.stringify(metrics))
  } catch (err) {
    console.warn('Falha ao gravar cache local de indicadores simples:', err)
  }
}

/**
 * Lê snapshot do armazenamento local
 */
export function getLocalMetricsCache(slug: string): ResidentialSimpleMetrics | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${slug}`)
    if (raw) {
      return JSON.parse(raw) as ResidentialSimpleMetrics
    }
  } catch (err) {
    console.warn('Falha ao ler cache local de indicadores simples:', err)
  }
  return null
}

/**
 * Consulta indicadores agregados do modo simples para um residencial
 */
export async function fetchResidentialSimpleMetrics(
  slug: string
): Promise<{ metrics: ResidentialSimpleMetrics | null; fromCache?: boolean; error?: string }> {
  try {
    // 1. Tentar obter via RPC de backend
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_residential_simple_metrics', {
      p_residencial_slug: slug,
    })

    if (!rpcError && rpcData && typeof rpcData === 'object') {
      const responseObj = rpcData as {
        residencial?: unknown
        metrics?: ResidentialSimpleMetricsRow & { last_updated_by_name?: string }
      }

      if (responseObj.metrics) {
        const metrics: ResidentialSimpleMetrics = {
          id: responseObj.metrics.id,
          residencial_id: responseObj.metrics.residencial_id,
          residencial_slug: responseObj.metrics.residencial_slug,
          total_capacity: responseObj.metrics.total_capacity,
          occupied_units: responseObj.metrics.occupied_units,
          available_units: responseObj.metrics.available_units,
          pcd_adapted_units: responseObj.metrics.pcd_adapted_units,
          pending_documents_count: responseObj.metrics.pending_documents_count,
          regular_documents_count: responseObj.metrics.regular_documents_count,
          dossiers_no_pending_count: responseObj.metrics.dossiers_no_pending_count,
          dossiers_with_pending_count: responseObj.metrics.dossiers_with_pending_count,
          dossiers_resubmitted_search_count: responseObj.metrics.dossiers_resubmitted_search_count,
          no_show_count: responseObj.metrics.no_show_count,
          dossiers_excluded_count: responseObj.metrics.dossiers_excluded_count,
          dossiers_compliant_count: responseObj.metrics.dossiers_compliant_count,
          dossiers_non_compliant_count: responseObj.metrics.dossiers_non_compliant_count,
          dossiers_batched_count: responseObj.metrics.dossiers_batched_count,
          proxies_needed_count: responseObj.metrics.proxies_needed_count,
          notes: responseObj.metrics.notes,
          custom_metrics: responseObj.metrics.custom_metrics,
          last_updated_by: responseObj.metrics.last_updated_by,
          last_updated_by_name: responseObj.metrics.last_updated_by_name || null,
          created_at: responseObj.metrics.created_at,
          updated_at: responseObj.metrics.updated_at,
        }
        cacheMetricsLocally(slug, metrics)
        return { metrics }
      }
      return { metrics: null }
    }

    // 2. Fallback: Consulta direta à tabela residential_simple_metrics
    const { data: tableData, error: tableError } = await (supabase.from('residential_simple_metrics') as any)
      .select('*')
      .eq('residencial_slug', slug)
      .maybeSingle()

    if (!tableError && tableData) {
      const row = tableData as ResidentialSimpleMetricsRow
      const metrics: ResidentialSimpleMetrics = {
        id: row.id,
        residencial_id: row.residencial_id,
        residencial_slug: row.residencial_slug,
        total_capacity: row.total_capacity,
        occupied_units: row.occupied_units,
        available_units: row.available_units,
        pcd_adapted_units: row.pcd_adapted_units,
        pending_documents_count: row.pending_documents_count,
        regular_documents_count: row.regular_documents_count,
        dossiers_no_pending_count: row.dossiers_no_pending_count,
        dossiers_with_pending_count: row.dossiers_with_pending_count,
        dossiers_resubmitted_search_count: row.dossiers_resubmitted_search_count,
        no_show_count: row.no_show_count,
        dossiers_excluded_count: row.dossiers_excluded_count,
        dossiers_compliant_count: row.dossiers_compliant_count,
        dossiers_non_compliant_count: row.dossiers_non_compliant_count,
        dossiers_batched_count: row.dossiers_batched_count,
        proxies_needed_count: row.proxies_needed_count,
        notes: row.notes,
        custom_metrics: row.custom_metrics,
        last_updated_by: row.last_updated_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
      cacheMetricsLocally(slug, metrics)
      return { metrics }
    }

    // 3. Fallback do cache local
    const cached = getLocalMetricsCache(slug)
    if (cached) {
      return { metrics: cached, fromCache: true }
    }

    return { metrics: null }
  } catch (err: unknown) {
    const cached = getLocalMetricsCache(slug)
    if (cached) {
      return { metrics: cached, fromCache: true }
    }
    return {
      metrics: null,
      error: err instanceof Error ? err.message : 'Erro ao consultar indicadores do modo simples',
    }
  }
}

/**
 * Salva alterações nos indicadores do modo simples com validação rigorosa
 */
export async function saveResidentialSimpleMetrics(
  slug: string,
  metrics: Partial<ResidentialSimpleMetrics>,
  currentUserId?: string
): Promise<{ success: boolean; message: string; data?: ResidentialSimpleMetrics }> {
  // 1. Validação de formato e números negativos
  const validation = validateSimpleMetrics(metrics)
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.errors.join(' | '),
    }
  }

  // 2. Prepara payload estritamente quantitativo (sem PII)
  const payload: Record<string, unknown> = {
    total_capacity: metrics.total_capacity ?? null,
    occupied_units: metrics.occupied_units ?? null,
    available_units: metrics.available_units ?? null,
    pcd_adapted_units: metrics.pcd_adapted_units ?? null,
    pending_documents_count: metrics.pending_documents_count ?? null,
    regular_documents_count: metrics.regular_documents_count ?? null,
    dossiers_no_pending_count: metrics.dossiers_no_pending_count ?? null,
    dossiers_with_pending_count: metrics.dossiers_with_pending_count ?? null,
    dossiers_resubmitted_search_count: metrics.dossiers_resubmitted_search_count ?? null,
    no_show_count: metrics.no_show_count ?? null,
    dossiers_excluded_count: metrics.dossiers_excluded_count ?? null,
    dossiers_compliant_count: metrics.dossiers_compliant_count ?? null,
    dossiers_non_compliant_count: metrics.dossiers_non_compliant_count ?? null,
    dossiers_batched_count: metrics.dossiers_batched_count ?? null,
    proxies_needed_count: metrics.proxies_needed_count ?? null,
    notes: metrics.notes || null,
    custom_metrics: metrics.custom_metrics || {},
  }

  try {
    // 3. Tentar persistência via RPC
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc('upsert_residential_simple_metrics', {
      p_residencial_slug: slug,
      p_metrics: payload,
    })

    if (!rpcError && rpcData) {
      const now = new Date().toISOString()
      const savedMetrics: ResidentialSimpleMetrics = {
        residencial_slug: slug,
        total_capacity: metrics.total_capacity ?? null,
        occupied_units: metrics.occupied_units ?? null,
        available_units: metrics.available_units ?? null,
        pcd_adapted_units: metrics.pcd_adapted_units ?? null,
        pending_documents_count: metrics.pending_documents_count ?? null,
        regular_documents_count: metrics.regular_documents_count ?? null,
        dossiers_no_pending_count: metrics.dossiers_no_pending_count ?? null,
        dossiers_with_pending_count: metrics.dossiers_with_pending_count ?? null,
        dossiers_resubmitted_search_count: metrics.dossiers_resubmitted_search_count ?? null,
        no_show_count: metrics.no_show_count ?? null,
        dossiers_excluded_count: metrics.dossiers_excluded_count ?? null,
        dossiers_compliant_count: metrics.dossiers_compliant_count ?? null,
        dossiers_non_compliant_count: metrics.dossiers_non_compliant_count ?? null,
        dossiers_batched_count: metrics.dossiers_batched_count ?? null,
        proxies_needed_count: metrics.proxies_needed_count ?? null,
        notes: metrics.notes || null,
        custom_metrics: metrics.custom_metrics || {},
        last_updated_by: currentUserId || null,
        updated_at: now,
      }
      cacheMetricsLocally(slug, savedMetrics)
      return {
        success: true,
        message: 'Indicadores quantitativos salvos com sucesso no backend.',
        data: savedMetrics,
      }
    }

    // 4. Fallback: Gravação direta na tabela
    // Localiza o residencial para pegar o id
    const { data: resData } = await (supabase.from('residenciais') as any)
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (resData?.id) {
      const { data: tableData, error: tableError } = await (supabase.from('residential_simple_metrics') as any)
        .upsert(
          {
            residencial_id: resData.id,
            residencial_slug: slug,
            total_capacity: metrics.total_capacity ?? null,
            occupied_units: metrics.occupied_units ?? null,
            available_units: metrics.available_units ?? null,
            pcd_adapted_units: metrics.pcd_adapted_units ?? null,
            pending_documents_count: metrics.pending_documents_count ?? null,
            regular_documents_count: metrics.regular_documents_count ?? null,
            dossiers_no_pending_count: metrics.dossiers_no_pending_count ?? null,
            dossiers_with_pending_count: metrics.dossiers_with_pending_count ?? null,
            dossiers_resubmitted_search_count: metrics.dossiers_resubmitted_search_count ?? null,
            no_show_count: metrics.no_show_count ?? null,
            dossiers_excluded_count: metrics.dossiers_excluded_count ?? null,
            dossiers_compliant_count: metrics.dossiers_compliant_count ?? null,
            dossiers_non_compliant_count: metrics.dossiers_non_compliant_count ?? null,
            dossiers_batched_count: metrics.dossiers_batched_count ?? null,
            proxies_needed_count: metrics.proxies_needed_count ?? null,
            notes: metrics.notes || null,
            custom_metrics: metrics.custom_metrics || {},
            last_updated_by: currentUserId || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'residencial_id' }
        )
        .select()
        .single()

      if (!tableError && tableData) {
        const row = tableData as ResidentialSimpleMetricsRow
        const savedMetrics: ResidentialSimpleMetrics = {
          id: row.id,
          residencial_id: row.residencial_id,
          residencial_slug: row.residencial_slug,
          total_capacity: row.total_capacity,
          occupied_units: row.occupied_units,
          available_units: row.available_units,
          pcd_adapted_units: row.pcd_adapted_units,
          pending_documents_count: row.pending_documents_count,
          regular_documents_count: row.regular_documents_count,
          dossiers_no_pending_count: row.dossiers_no_pending_count,
          dossiers_with_pending_count: row.dossiers_with_pending_count,
          dossiers_resubmitted_search_count: row.dossiers_resubmitted_search_count,
          no_show_count: row.no_show_count,
          dossiers_excluded_count: row.dossiers_excluded_count,
          dossiers_compliant_count: row.dossiers_compliant_count,
          dossiers_non_compliant_count: row.dossiers_non_compliant_count,
          dossiers_batched_count: row.dossiers_batched_count,
          proxies_needed_count: row.proxies_needed_count,
          notes: row.notes,
          custom_metrics: row.custom_metrics,
          last_updated_by: row.last_updated_by,
          updated_at: row.updated_at,
        }
        cacheMetricsLocally(slug, savedMetrics)
        return {
          success: true,
          message: 'Indicadores salvos com sucesso.',
          data: savedMetrics,
        }
      }
    }

    // Se houve erro no RPC e tabela
    throw new Error(rpcError?.message || 'Falha ao salvar indicadores no backend.')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha na comunicação com o banco de dados.'
    return {
      success: false,
      message,
    }
  }
}

/**
 * Consulta histórico quantitativo de auditoria do modo simples
 */
export async function fetchResidentialMetricsHistory(
  slug: string,
  limit = 10
): Promise<MetricsHistoryEntry[]> {
  try {
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_residential_metrics_history', {
      p_residencial_slug: slug,
      p_limit: limit,
    })

    if (!rpcError && Array.isArray(rpcData)) {
      return rpcData as MetricsHistoryEntry[]
    }

    const { data: tableData, error: tableError } = await (supabase.from('residential_metrics_history') as any)
      .select('*')
      .eq('residencial_slug', slug)
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (!tableError && Array.isArray(tableData)) {
      return tableData.map((row) => ({
        id: row.id,
        recorded_at: row.recorded_at,
        updated_by: row.updated_by,
        updated_by_name: 'Profissional',
        reason: row.reason,
        metrics_snapshot: row.metrics_snapshot as Record<string, unknown>,
      }))
    }

    return []
  } catch (err) {
    console.warn('Erro ao carregar histórico quantitativo:', err)
    return []
  }
}
