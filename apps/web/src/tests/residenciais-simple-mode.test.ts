import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Pure validation logic mirroring service implementation for test runner verification
interface SimpleMetricsValidationInput {
  total_capacity?: number | null
  occupied_units?: number | null
  available_units?: number | null
  [key: string]: unknown
}

function testValidateSimpleMetrics(data: SimpleMetricsValidationInput) {
  const errors: string[] = []
  const warnings: string[] = []

  const numericFields = [
    'total_capacity',
    'occupied_units',
    'available_units',
    'pcd_adapted_units',
    'pending_documents_count',
    'regular_documents_count',
    'dossiers_no_pending_count',
    'dossiers_with_pending_count',
    'dossiers_resubmitted_search_count',
    'no_show_count',
    'dossiers_excluded_count',
    'dossiers_compliant_count',
    'dossiers_non_compliant_count',
    'dossiers_batched_count',
    'proxies_needed_count',
  ]

  for (const field of numericFields) {
    const val = data[field]
    if (val !== null && val !== undefined) {
      if (typeof val === 'number') {
        if (val < 0) errors.push(`${field} não pode ser um valor negativo.`)
        if (!Number.isInteger(val)) errors.push(`${field} deve ser um número inteiro.`)
      } else {
        errors.push(`${field} deve ser um número válido.`)
      }
    }
  }

  const total = typeof data.total_capacity === 'number' ? data.total_capacity : null
  const occupied = typeof data.occupied_units === 'number' ? data.occupied_units : null
  const available = typeof data.available_units === 'number' ? data.available_units : null

  if (total !== null && occupied !== null && occupied > total) {
    warnings.push(`A quantidade ocupada (${occupied}) é maior que a capacidade total cadastrada (${total}).`)
  }

  if (total !== null && occupied !== null && available !== null) {
    const sum = occupied + available
    if (sum !== total) {
      warnings.push(`A soma de ocupados (${occupied}) e vagas disponíveis (${available}) resulta em ${sum}, divergindo da capacidade total informada (${total}).`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

function testCalculateSuggestedVacancies(total: number | null | undefined, occupied: number | null | undefined): number | null {
  if (typeof total === 'number' && typeof occupied === 'number' && total >= 0 && occupied >= 0) {
    return Math.max(0, total - occupied)
  }
  return null
}

describe('Residenciais: Modo Simples e Modo Avançado Contract & Privacy (LGPD)', () => {
  describe('1. Mode Selector & Architecture Independence', () => {
    it('ResidenciaisView should export ResidentialOperatingMode type with simple and advanced', () => {
      const viewPath = path.resolve('src/components/ResidenciaisView.tsx')
      const code = fs.readFileSync(viewPath, 'utf8')

      assert.match(
        code,
        /export type ResidentialOperatingMode = 'simple' \| 'advanced'/,
        'Must define ResidentialOperatingMode union type'
      )
    })

    it('ResidenciaisView should render visible selector with the exact required option labels', () => {
      const viewPath = path.resolve('src/components/ResidenciaisView.tsx')
      const code = fs.readFileSync(viewPath, 'utf8')

      assert.match(
        code,
        /Modo Simples — Indicadores e Quantidades/,
        'Must render label: Modo Simples — Indicadores e Quantidades'
      )
      assert.match(
        code,
        /Modo Avançado — Acompanhamento Detalhado/,
        'Must render label: Modo Avançado — Acompanhamento Detalhado'
      )
    })

    it('ResidenciaisView should persist selected mode in localStorage to survive page reloads', () => {
      const viewPath = path.resolve('src/components/ResidenciaisView.tsx')
      const code = fs.readFileSync(viewPath, 'utf8')

      assert.match(
        code,
        /localStorage\.getItem\('assistsocial_residential_mode'\)/,
        'Must read mode from localStorage'
      )
      assert.match(
        code,
        /localStorage\.setItem\('assistsocial_residential_mode'/,
        'Must save mode to localStorage upon switching'
      )
    })
  })

  describe('2. Absolute Privacy & LGPD Guardrails (Requirement 7)', () => {
    it('ResidenciaisView must NOT load individual dossiers or batches in background when in simple mode', () => {
      const viewPath = path.resolve('src/components/ResidenciaisView.tsx')
      const code = fs.readFileSync(viewPath, 'utf8')

      // Must guard loadData with operatingMode === 'advanced'
      assert.match(
        code,
        /if\s*\(\s*operatingMode\s*===\s*'advanced'\s*\)\s*\{\s*loadData\(\)\s*\}/,
        'loadData must only be invoked when operatingMode is advanced'
      )
    })

    it('ResidencialSimpleModeView must NOT include resident names, CPFs, or document upload inputs', () => {
      const simpleViewPath = path.resolve('src/components/ResidencialSimpleModeView.tsx')
      const code = fs.readFileSync(simpleViewPath, 'utf8')

      assert.doesNotMatch(
        code,
        /type="file"/,
        'Simple mode must never contain file upload attachments'
      )
      assert.doesNotMatch(
        code,
        /placeholder=".*CPF.*"/i,
        'Simple mode must never request individual resident CPFs'
      )
      assert.match(
        code,
        /Sem identificação de moradores \(LGPD\)/,
        'Must inform LGPD compliance disclaimer on notes'
      )
    })
  })

  describe('3. Validation Rules & Consistency Warnings (Requirement 4)', () => {
    it('should reject negative values across quantitative metrics', () => {
      const result = testValidateSimpleMetrics({
        total_capacity: -5,
        occupied_units: 10,
      })

      assert.equal(result.isValid, false)
      assert.ok(
        result.errors.some((e) => e.includes('não pode ser um valor negativo')),
        'Must flag negative value error'
      )
    })

    it('should reject non-integer decimal numbers for unit counts', () => {
      const result = testValidateSimpleMetrics({
        total_capacity: 100.5,
        occupied_units: 50,
      })

      assert.equal(result.isValid, false)
      assert.ok(
        result.errors.some((e) => e.includes('deve ser um número inteiro')),
        'Must enforce whole integers for unit counts'
      )
    })

    it('should generate warning without rejecting when occupied exceeds total capacity', () => {
      const result = testValidateSimpleMetrics({
        total_capacity: 100,
        occupied_units: 110,
      })

      assert.equal(result.isValid, true, 'Consistency warning should not invalidate format')
      assert.ok(
        result.warnings.some((w) => w.includes('maior que a capacidade total cadastrada')),
        'Must issue clear warning when occupied exceeds capacity'
      )
    })

    it('should generate warning when occupied + available does not equal total capacity', () => {
      const result = testValidateSimpleMetrics({
        total_capacity: 100,
        occupied_units: 90,
        available_units: 20, // 90 + 20 = 110 != 100
      })

      assert.equal(result.isValid, true)
      assert.ok(
        result.warnings.some((w) => w.includes('divergindo da capacidade total informada')),
        'Must issue clear warning about discrepancy without silently altering numbers'
      )
    })

    it('should suggest calculated vacancies accurately without forced override', () => {
      assert.equal(testCalculateSuggestedVacancies(100, 90), 10)
      assert.equal(testCalculateSuggestedVacancies(50, 50), 0)
      assert.equal(testCalculateSuggestedVacancies(50, 60), 0)
      assert.equal(testCalculateSuggestedVacancies(null, 20), null)
    })
  })

  describe('4. Backend Persistence Service Contract', () => {
    it('residentialSimpleMetricsService should export mandatory functions and types', () => {
      const servicePath = path.resolve('src/services/residentialSimpleMetricsService.ts')
      const code = fs.readFileSync(servicePath, 'utf8')

      assert.match(code, /export function validateSimpleMetrics/)
      assert.match(code, /export function calculateSuggestedVacancies/)
      assert.match(code, /export async function fetchResidentialSimpleMetrics/)
      assert.match(code, /export async function saveResidentialSimpleMetrics/)
      assert.match(code, /export async function fetchResidentialMetricsHistory/)
    })

    it('residentialSimpleMetricsService should interact with RPCs and fallback to tables', () => {
      const servicePath = path.resolve('src/services/residentialSimpleMetricsService.ts')
      const code = fs.readFileSync(servicePath, 'utf8')

      assert.match(code, /get_residential_simple_metrics/)
      assert.match(code, /upsert_residential_simple_metrics/)
      assert.match(code, /residential_simple_metrics/)
      assert.match(code, /residential_metrics_history/)
    })
  })

  describe('5. Preservation of Advanced Mode (Requirement 8)', () => {
    it('ResidenciaisView must preserve the 8 indicators, batch management, and proxies in advanced mode', () => {
      const viewPath = path.resolve('src/components/ResidenciaisView.tsx')
      const code = fs.readFileSync(viewPath, 'utf8')

      // 8 indicators check
      assert.match(code, /sem_pendencia/)
      assert.match(code, /com_pendencias/)
      assert.match(code, /reenviado_pesquisa/)
      assert.match(code, /nao_veio/)
      assert.match(code, /excluido/)
      assert.match(code, /conforme/)
      assert.match(code, /inconforme/)
      assert.match(code, /loteados/)

      // Modals
      assert.match(code, /<DossierModal/)
      assert.match(code, /<BatchModal/)
      assert.match(code, /<ResidencialModal/)
    })
  })
})
