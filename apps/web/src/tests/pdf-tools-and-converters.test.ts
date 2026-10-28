import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'

describe('Central de Ferramentas — PDF, Conversores & Processamento de Documentos Suite', () => {
  describe('1. Sidebar & Dashboard Integration Contract', () => {
    it('Sidebar must expose tools tab with Ferramentas PDF label, icon and badge', () => {
      const sidebarPath = path.resolve('src/components/Sidebar.tsx')
      const sidebarCode = fs.readFileSync(sidebarPath, 'utf8')

      assert.match(sidebarCode, /id:\s*'tools'/, 'Sidebar must define tools menu item')
      assert.match(sidebarCode, /Ferramentas PDF/, 'Sidebar must display Ferramentas PDF label')
      assert.match(sidebarCode, /Wrench/, 'Sidebar must render Wrench icon for tools')
      assert.match(sidebarCode, /badge:\s*'NOVO'|badge:\s*'PDF'/, 'Sidebar should badge tools tab')
    })

    it('MainDashboard must route tools tab to ToolsView component', () => {
      const dashboardPath = path.resolve('src/pages/MainDashboard.tsx')
      const dashboardCode = fs.readFileSync(dashboardPath, 'utf8')

      assert.match(dashboardCode, /import \{ ToolsView \}/, 'MainDashboard must import ToolsView')
      assert.match(dashboardCode, /currentTab === 'tools'/, 'MainDashboard must check currentTab === tools')
      assert.match(dashboardCode, /<ToolsView/, 'MainDashboard must render ToolsView')
    })
  })

  describe('2. PDF Engine Contract & In-Memory Operations (pdf-lib)', () => {
    it('should create valid PDF documents in memory with pdf-lib', async () => {
      const pdfDoc = await PDFDocument.create()
      const page1 = pdfDoc.addPage([595.28, 841.89]) // A4
      page1.drawText('AssistSocial — Documento de Teste', { x: 50, y: 800, size: 14 })

      const page2 = pdfDoc.addPage([595.28, 841.89])
      page2.drawText('Página 2 — Verificação Técnica', { x: 50, y: 800, size: 14 })

      const pdfBytes = await pdfDoc.save()
      assert.ok(pdfBytes.length > 500, `Generated PDF bytes must be non-empty (actual: ${pdfBytes.length} bytes)`)

      // Verify PDF magic header (%PDF-)
      const header = Buffer.from(pdfBytes.slice(0, 5)).toString()
      assert.equal(header, '%PDF-', 'Must start with standard PDF header')
    })

    it('should support merging multiple PDF documents', async () => {
      const doc1 = await PDFDocument.create()
      doc1.addPage([400, 400])
      const bytes1 = await doc1.save()

      const doc2 = await PDFDocument.create()
      doc2.addPage([400, 400])
      doc2.addPage([400, 400])
      const bytes2 = await doc2.save()

      const mergedDoc = await PDFDocument.create()
      const loaded1 = await PDFDocument.load(bytes1)
      const loaded2 = await PDFDocument.load(bytes2)

      const pages1 = await mergedDoc.copyPages(loaded1, loaded1.getPageIndices())
      pages1.forEach((p) => mergedDoc.addPage(p))

      const pages2 = await mergedDoc.copyPages(loaded2, loaded2.getPageIndices())
      pages2.forEach((p) => mergedDoc.addPage(p))

      assert.equal(mergedDoc.getPageCount(), 3, 'Merged document must contain 1 + 2 = 3 pages')
      const mergedBytes = await mergedDoc.save()
      assert.ok(mergedBytes.length > bytes1.length)
    })

    it('should support page rotation (90, 180, 270 degrees)', async () => {
      const doc = await PDFDocument.create()
      const page = doc.addPage([400, 600])
      assert.equal(page.getRotation().angle, 0)

      page.setRotation({ angle: 90, type: 'degrees' } as any)
      assert.equal(page.getRotation().angle, 90)

      const bytes = await doc.save()
      const reloaded = await PDFDocument.load(bytes)
      assert.equal(reloaded.getPages()[0].getRotation().angle, 90)
    })
  })

  describe('3. ToolsView UI Component Contract', () => {
    const viewPath = path.resolve('src/components/ToolsView.tsx')
    const viewCode = fs.readFileSync(viewPath, 'utf8')

    it('should implement all 6 core document and conversion tools', () => {
      const expectedTools = [
        'merge_pdf',
        'split_pdf',
        'images_to_pdf',
        'convert_image',
        'rotate_pdf',
        'watermark_pdf',
      ]

      expectedTools.forEach((toolId) => {
        assert.match(viewCode, new RegExp(`id:\\s*'${toolId}'`), `ToolsView must implement tool: ${toolId}`)
      })
    })

    it('should display LGPD and ethical privacy assurances (100% client-side processing)', () => {
      assert.match(viewCode, /100% no Navegador/, 'Must reassure client-side execution')
      assert.match(viewCode, /Privacidade LGPD/, 'Must highlight LGPD compliance')
      assert.match(viewCode, /Sigilo Ético Profissional/, 'Must state CFESS ethical confidentiality')
    })

    it('should connect to Supabase document processing jobs audit RPC', () => {
      assert.match(viewCode, /get_user_document_jobs/, 'Must query user document processing jobs')
      assert.match(viewCode, /logProcessingJobToSupabase/, 'Must trigger audit logging')
    })
  })
})
