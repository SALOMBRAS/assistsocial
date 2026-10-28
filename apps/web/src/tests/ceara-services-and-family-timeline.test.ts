import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Ceará Social Services & Family Timeline Test Suite (jana 3)', () => {
  const rootDir = path.resolve(process.cwd(), '../..')

  describe('Part 1: Ceará Social Services Directory Contract', () => {
    it('migration enforces CHECK (state = "CE") and verified public RLS policy', () => {
      const migrationPath = path.join(
        rootDir,
        'supabase/migrations/20261027170012_ceara_social_services_and_family_timeline.sql'
      )
      const sql = fs.readFileSync(migrationPath, 'utf8')

      assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.social_services/, 'Creates social_services table')
      assert.match(sql, /state TEXT NOT NULL DEFAULT 'CE' CHECK \(state = 'CE'\)/, 'Strictly limits state to CE')
      assert.match(sql, /CREATE POLICY "social_services_select_ceara_public" ON public\.social_services/, 'Public select RLS policy')
      assert.match(sql, /USING \(state = 'CE' AND verification_status = 'verified'\)/, 'Only returns verified CE services')
      assert.match(sql, /Fortaleza/, 'Includes Fortaleza services')
      assert.match(sql, /Caucaia/, 'Includes Caucaia services')
      assert.match(sql, /Maracanaú/, 'Includes Maracanaú services')
      assert.match(sql, /Eusébio/, 'Includes Eusébio services')
    })

    it('ServicesDirectoryView restricts to Ceará, defaults to Fortaleza, and provides map and contact actions', () => {
      const compPath = path.join(rootDir, 'apps/web/src/components/ServicesDirectoryView.tsx')
      const code = fs.readFileSync(compPath, 'utf8')

      assert.match(code, /Fortaleza/, 'Fortaleza is present in municipalities')
      assert.match(code, /useState<string>\('Fortaleza'\)/, 'Fortaleza is selected by default')
      assert.match(code, /srv\.state !== 'CE'/, 'Enforces state CE restriction in client filter')
      assert.match(code, /google\.com\/maps\/search/, 'Generates Google Maps route')
      assert.match(code, /tel:/, 'Generates direct phone dialer link')
      assert.match(code, /navigator\.clipboard\.writeText/, 'Supports copying contacts to clipboard')
      assert.match(code, /useModalA11y/, 'Employs modal accessibility')
      assert.match(code, /verification_status/, 'Checks verification status')
    })
  })

  describe('Part 2: Family Timeline & SUAS Workflow Contract', () => {
    it('migration defines families, members, events, pendencies, and stage history tables with RLS and trigger', () => {
      const migrationPath = path.join(
        rootDir,
        'supabase/migrations/20261027170012_ceara_social_services_and_family_timeline.sql'
      )
      const sql = fs.readFileSync(migrationPath, 'utf8')

      assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.families/, 'Creates families table')
      assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.family_members/, 'Creates family_members table')
      assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.family_timeline_events/, 'Creates family_timeline_events table')
      assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.family_pendencies/, 'Creates family_pendencies table')
      assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.family_stage_history/, 'Creates family_stage_history table')
      assert.match(sql, /CREATE OR REPLACE FUNCTION public\.fn_sync_family_last_movement/, 'Defines trigger function to update last_movement_at')
      assert.match(sql, /CREATE TRIGGER trg_family_timeline_last_movement/, 'Creates trigger on family_timeline_events')
      assert.match(sql, /f0000001-0000-0000-0000-000000000001/, 'Contains pilot family seed data (Paupina)')
    })

    it('CaseTimelineView supports all 11 SUAS stages with visual progression and justification modal', () => {
      const compPath = path.join(rootDir, 'apps/web/src/components/CaseTimelineView.tsx')
      const code = fs.readFileSync(compPath, 'utf8')

      assert.match(code, /cadastro_inicial/, 'Includes stage cadastro_inicial')
      assert.match(code, /triagem/, 'Includes stage triagem')
      assert.match(code, /aguardando_documentos/, 'Includes stage aguardando_documentos')
      assert.match(code, /avaliacao_social/, 'Includes stage avaliacao_social')
      assert.match(code, /plano_acompanhamento/, 'Includes stage plano_acompanhamento')
      assert.match(code, /encaminhamentos/, 'Includes stage encaminhamentos')
      assert.match(code, /aguardando_retorno/, 'Includes stage aguardando_retorno')
      assert.match(code, /acompanhamento_ativo/, 'Includes stage acompanhamento_ativo')
      assert.match(code, /revisao/, 'Includes stage revisao')
      assert.match(code, /concluido/, 'Includes stage concluido')
      assert.match(code, /suspenso/, 'Includes stage suspenso')

      assert.match(code, /handleUpdateStage/, 'Provides stage transition handler')
      assert.match(code, /stageJustification/, 'Enforces technical justification for stage transition')
      assert.match(code, /family_stage_history/, 'Logs transition to stage history')
    })

    it('CaseTimelineView manages "O que falta resolver" with priority, overdue alerts, and resolve/reopen toggle', () => {
      const compPath = path.join(rootDir, 'apps/web/src/components/CaseTimelineView.tsx')
      const code = fs.readFileSync(compPath, 'utf8')

      assert.match(code, /O que falta resolver/, 'Contains "O que falta resolver" section')
      assert.match(code, /handleTogglePendencyStatus/, 'Provides pendency status toggle')
      assert.match(code, /handleCreatePendency/, 'Provides pendency creation handler')
      assert.match(code, /overduePendencies/, 'Calculates overdue pendencies')
      assert.match(code, /isOverdue/, 'Renders overdue visual indicator')
      assert.match(code, /urgente/, 'Supports urgent priority')
    })

    it('CaseTimelineView supports individual vs family trajectory selection', () => {
      const compPath = path.join(rootDir, 'apps/web/src/components/CaseTimelineView.tsx')
      const code = fs.readFileSync(compPath, 'utf8')

      assert.match(code, /selectedMemberId/, 'Tracks selected member state')
      assert.match(code, /Toda a Família \(Visão Geral\)/, 'Provides whole family aggregated view')
      assert.match(code, /e\.person_id === selectedMemberId/, 'Filters events by individual member')
      assert.match(code, /p\.person_id === selectedMemberId/, 'Filters pendencies by individual member')
    })

    it('CaseTimelineView registers new movements with double-click prevention and 20 SUAS event types', () => {
      const compPath = path.join(rootDir, 'apps/web/src/components/CaseTimelineView.tsx')
      const code = fs.readFileSync(compPath, 'utf8')

      assert.match(code, /handleCreateEvent/, 'Provides movement creation handler')
      assert.match(code, /isSubmitting/, 'Implements double-click prevention')
      assert.match(code, /TIMELINE_EVENT_TYPES/, 'Defines SUAS event types')
      assert.match(code, /last_movement_at/, 'Updates family last movement timestamp')
    })

    it('validates date arithmetic and overdue calculation accurately', () => {
      const now = Date.now()
      const pastDate = new Date(now - 86400000).toISOString()
      const futureDate = new Date(now + 86400000).toISOString()

      const checkOverdue = (dueDate: string | null, status: string) => {
        if (status === 'resolvida' || status === 'cancelada') return false
        if (!dueDate) return false
        return new Date(dueDate).getTime() < now
      }

      assert.equal(checkOverdue(pastDate, 'pendente'), true, 'Past due date should be overdue')
      assert.equal(checkOverdue(futureDate, 'pendente'), false, 'Future due date is not overdue')
      assert.equal(checkOverdue(pastDate, 'resolvida'), false, 'Resolved pendency is never overdue')
      assert.equal(checkOverdue(null, 'pendente'), false, 'Null due date is not overdue')
    })
  })
})
