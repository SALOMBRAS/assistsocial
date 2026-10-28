import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as docx from 'docx'

describe('Sidebar Hover-Responsive & Word DOCX Document Studio Suite (jana 1)', () => {
  describe('1. Sidebar Compact, Hover-Responsive & Accessibility Contract', () => {
    const sidebarPath = path.resolve('src/components/Sidebar.tsx')
    const sidebarCode = fs.readFileSync(sidebarPath, 'utf8')

    it('should be collapsed (w-20 / 80px) by default and expand to w-64 on hover', () => {
      assert.match(sidebarCode, /w-20/, 'Sidebar must collapse to w-20 by default')
      assert.match(sidebarCode, /w-64/, 'Sidebar must expand to w-64')
      assert.match(sidebarCode, /onMouseEnter/, 'Sidebar must listen to onMouseEnter')
      assert.match(sidebarCode, /onMouseLeave/, 'Sidebar must listen to onMouseLeave')
    })

    it('should use smooth 200ms transitions and respect motion-reduce', () => {
      assert.match(sidebarCode, /duration-200/, 'Sidebar must transition with duration-200 (~200ms)')
      assert.match(sidebarCode, /motion-reduce:transition-none/, 'Sidebar must honor prefers-reduced-motion')
    })

    it('should expand over content with z-40 and shadow without reflow', () => {
      assert.match(sidebarCode, /fixed left-0 top-0 bottom-0 z-40/, 'Sidebar must be fixed overlay to prevent pushing layout')
      assert.match(sidebarCode, /shadow-\[4px_0_24px_rgba\(240,68,145,0\.12\)\]/, 'Sidebar must have elevation shadow on expand')
    })

    it('should support full keyboard accessibility (focus capture, blur capture, Escape key)', () => {
      assert.match(sidebarCode, /onFocusCapture/, 'Sidebar must expand when receiving keyboard focus')
      assert.match(sidebarCode, /onBlurCapture/, 'Sidebar must collapse when losing keyboard focus')
      assert.match(sidebarCode, /onKeyDown/, 'Sidebar must handle keydown')
      assert.match(sidebarCode, /key === 'Escape'/, 'Sidebar must collapse on Escape key')
      assert.match(sidebarCode, /aria-expanded/, 'Sidebar must declare aria-expanded')
    })

    it('should show tooltips on icons when collapsed', () => {
      assert.match(sidebarCode, /title=\{!isHovered \? item\.label : undefined\}/, 'Must provide tooltips when collapsed')
    })

    it('should replace duplicate activities with official documents tab (DOCX)', () => {
      assert.match(sidebarCode, /id:\s*'documents'/, 'Sidebar must contain documents tab')
      assert.match(sidebarCode, /Documentos Word/, 'Sidebar must label tab as Documentos Word')
      assert.match(sidebarCode, /badge:\s*'DOCX'/, 'Sidebar should badge documents tab with DOCX')
      assert.match(sidebarCode, /FileText/, 'Sidebar must use FileText icon for documents')
      assert.match(sidebarCode, /id:\s*'activities'/, 'Sidebar must retain legacy activities reference for route safety')
    })

    it('should preserve mobile slide-in drawer with modal a11y', () => {
      assert.match(sidebarCode, /isMobileOpen/, 'Sidebar must support isMobileOpen prop')
      assert.match(sidebarCode, /useModalA11y/, 'Sidebar must use useModalA11y')
      assert.match(sidebarCode, /role="dialog"/, 'Mobile drawer must have role="dialog"')
    })
  })

  describe('2. MainDashboard Layout Stability & Document View Integration', () => {
    const dashboardPath = path.resolve('src/pages/MainDashboard.tsx')
    const dashboardCode = fs.readFileSync(dashboardPath, 'utf8')

    it('should use md:pl-20 content gutter to prevent content reflow during hover', () => {
      assert.match(dashboardCode, /md:pl-20/, 'MainDashboard must reserve fixed md:pl-20 gutter for stable layout')
    })

    it('should render DocumentEditorView when currentTab is documents', () => {
      assert.match(dashboardCode, /import \{ DocumentEditorView \}/, 'Must import DocumentEditorView')
      assert.match(dashboardCode, /currentTab === 'documents'/, 'Must route documents tab to DocumentEditorView')
      assert.match(dashboardCode, /<DocumentEditorView/, 'Must render DocumentEditorView component')
    })

    it('should preserve fallback compatibility for activities tab', () => {
      assert.match(dashboardCode, /currentTab === 'activities'/, 'Must keep activities tab routing safely without crash')
    })
  })

  describe('3. 14 Official SUAS Document Templates & Privacy Specification', () => {
    const servicePath = path.resolve('src/services/documentEditorService.ts')
    const serviceCode = fs.readFileSync(servicePath, 'utf8')

    it('should provide all 14 official SUAS document models required by the specification', () => {
      const expectedTemplateIds = [
        'relatorio_social',
        'estudo_social',
        'parecer_social',
        'visita_domiciliar',
        'plano_paif',
        'encaminhamento',
        'declaracao_atendimento',
        'oficio_institucional',
        'ata_reuniao',
        'termo_consentimento',
        'registro_atendimento',
        'plano_acao',
        'solicitacao_documentos',
        'folha_timbrada_em_branco',
      ]

      expectedTemplateIds.forEach((id) => {
        assert.match(serviceCode, new RegExp(`id:\\s*'${id}'`), `Template with id "${id}" must exist in documentEditorService`)
      })
    })

    it('should NOT contain fake personal names or fictitious identities (LGPD & Privacy compliant)', () => {
      assert.doesNotMatch(serviceCode, /João da Silva|Maria dos Santos|Fulano de Tal|José da Silva/i, 'Templates must not use fictitious names')
    })

    it('should provide default professional letterhead settings for SUAS CRAS/CREAS', () => {
      assert.match(serviceCode, /pageSize:\s*'A4'/)
      assert.match(serviceCode, /includeLetterhead:\s*true/)
      assert.match(serviceCode, /includeSignature:\s*true/)
      assert.match(serviceCode, /includePageNumbers:\s*true/)
    })
  })

  describe('4. Real DOCX Generation Engine & Binary Archive Integrity', () => {
    it('should compile valid Word .docx using the docx library', async () => {
      const doc = new docx.Document({
        sections: [
          {
            properties: {
              page: {
                size: { width: 11906, height: 16838 }, // A4 in dxa
                margin: { top: 1417, bottom: 1417, left: 1701, right: 1134 },
              },
            },
            headers: {
              default: new docx.Header({
                children: [
                  new docx.Paragraph({
                    alignment: docx.AlignmentType.CENTER,
                    children: [
                      new docx.TextRun({
                        text: 'SECRETARIA MUNICIPAL DE PROTEÇÃO SOCIAL',
                        bold: true,
                        size: 20,
                        color: '28232A',
                      }),
                    ],
                  }),
                ],
              }),
            },
            footers: {
              default: new docx.Footer({
                children: [
                  new docx.Paragraph({
                    alignment: docx.AlignmentType.CENTER,
                    children: [
                      new docx.TextRun({
                        text: 'AssistSocial — Documento Oficial Emitido com Segurança',
                        size: 16,
                        color: '827780',
                      }),
                    ],
                  }),
                ],
              }),
            },
            children: [
              new docx.Paragraph({
                alignment: docx.AlignmentType.CENTER,
                heading: docx.HeadingLevel.HEADING_1,
                children: [
                  new docx.TextRun({
                    text: 'RELATÓRIO SOCIAL CIRCUNSTANCIADO',
                    bold: true,
                    size: 28,
                    color: 'F04491',
                  }),
                ],
              }),
              new docx.Paragraph({
                alignment: docx.AlignmentType.JUSTIFIED,
                children: [
                  new docx.TextRun({
                    text: 'O presente documento registra os apontamentos técnicos socioassistenciais conforme diretrizes do SUAS.',
                    size: 24,
                  }),
                ],
              }),
              new docx.Table({
                width: { size: 100, type: docx.WidthType.PERCENTAGE },
                rows: [
                  new docx.TableRow({
                    children: [
                      new docx.TableCell({
                        children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Indicador', bold: true })] })],
                      }),
                      new docx.TableCell({
                        children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Situação', bold: true })] })],
                      }),
                    ],
                  }),
                  new docx.TableRow({
                    children: [
                      new docx.TableCell({
                        children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Habitabilidade' })] })],
                      }),
                      new docx.TableCell({
                        children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Alvenaria com saneamento' })] })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          },
        ],
      })

      const buffer = await docx.Packer.toBuffer(doc)
      assert.ok(buffer.length > 1000, `Generated docx archive must be substantial (actual: ${buffer.length} bytes)`)

      // Verify ZIP / OpenXML archive magic bytes (PK\x03\x04)
      assert.equal(buffer[0], 0x50)
      assert.equal(buffer[1], 0x4b)
      assert.equal(buffer[2], 0x03)
      assert.equal(buffer[3], 0x04)
    })
  })

  describe('5. Document Studio View UI Structure Contract', () => {
    const viewPath = path.resolve('src/components/DocumentEditorView.tsx')
    const viewCode = fs.readFileSync(viewPath, 'utf8')

    it('should implement gallery view with search, category filtering, new doc, and template picker', () => {
      assert.match(viewCode, /Documento em Branco/, 'Must provide button for new blank document')
      assert.match(viewCode, /Usar Modelo/, 'Must provide button for using templates')
      assert.match(viewCode, /searchTerm/, 'Must implement search query filter')
      assert.match(viewCode, /activeCategoryFilter/, 'Must implement category filter')
      assert.match(viewCode, /OFFICIAL_TEMPLATES/, 'Must bind to SUAS templates')
    })

    it('should implement visual A4 canvas editor with letterhead drawer and live docx download', () => {
      assert.match(viewCode, /max-w-\[820px\]/, 'Editor canvas must adhere to A4 proportions')
      assert.match(viewCode, /min-h-\[1140px\]/, 'Editor canvas must adhere to A4 dimensions')
      assert.match(viewCode, /downloadDocxFile/, 'Must invoke downloadDocxFile on user export')
      assert.match(viewCode, /saveUserEditorDocument/, 'Must persist drafts via saveUserEditorDocument')
      assert.match(viewCode, /showSettingsDrawer/, 'Must provide letterhead customization panel')
    })
  })
})
