import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Activity Instant Attachments on Creation Contract', () => {
  describe('ActivityAttachmentsSection Staging & Preview', () => {
    it('should support pendingFiles, onAddPendingFile and onRemovePendingFile props', () => {
      const filePath = path.resolve('src/components/ActivityAttachmentsSection.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /pendingFiles\?:?\s*File\[\]/, 'Must define pendingFiles prop')
      assert.match(code, /onAddPendingFile\?:?\s*\(file:\s*File\)\s*=>\s*void/, 'Must define onAddPendingFile callback')
      assert.match(code, /onRemovePendingFile\?:?\s*\(index:\s*number\)\s*=>\s*void/, 'Must define onRemovePendingFile callback')
    })

    it('should allow file selection even when activityId is undefined (creation stage)', () => {
      const filePath = path.resolve('src/components/ActivityAttachmentsSection.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /\{!readOnly && \(/, 'Attach button must be enabled during activity creation without requiring activityId')
      assert.doesNotMatch(code, /Salve a atividade primeiro para habilitar o envio/, 'Must remove legacy blocking message')
    })

    it('should validate 25MB file size limit and support multiple file selection', () => {
      const filePath = path.resolve('src/components/ActivityAttachmentsSection.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /25 \* 1024 \* 1024/, 'Must enforce 25MB maximum file size')
      assert.match(code, /multiple/, 'File input must support multiple file selection')
    })

    it('should render staged pending files with remove action and formatFileSize', () => {
      const filePath = path.resolve('src/components/ActivityAttachmentsSection.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /pendingFiles\.map/, 'Must render list of pending staged files')
      assert.match(code, /formatFileSize\(file\.size\)/, 'Must display formatted file size for staged files')
      assert.match(code, /onRemovePendingFile\(idx\)/, 'Must provide remove button for each staged file')
    })
  })

  describe('ActivityModal Lifecycle & Submitting State', () => {
    it('should manage pendingFiles state and pass it to ActivityAttachmentsSection', () => {
      const filePath = path.resolve('src/components/ActivityModal.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /const \[pendingFiles, setPendingFiles\] = useState<File\[\]>\(\[\]\)/, 'ActivityModal must manage pendingFiles state')
      assert.match(code, /pendingFiles=\{pendingFiles\}/, 'Must pass pendingFiles to ActivityAttachmentsSection')
      assert.match(code, /onAddPendingFile=\{handleAddPendingFile\}/, 'Must pass handleAddPendingFile to ActivityAttachmentsSection')
      assert.match(code, /onRemovePendingFile=\{handleRemovePendingFile\}/, 'Must pass handleRemovePendingFile to ActivityAttachmentsSection')
    })

    it('should pass pendingFiles in onSave and handle isSubmitting spinner', () => {
      const filePath = path.resolve('src/components/ActivityModal.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /pendingFiles,\s*\}/, 'Must include pendingFiles in onSave payload')
      assert.match(code, /disabled=\{isSubmitting\}/, 'Submit button must be disabled during submission')
      assert.match(code, /animate-spin/, 'Submit button must show spinner during submission')
    })
  })

  describe('MainDashboard Instant Storage & Attachments Ingestion', () => {
    it('should process pendingFiles upload and register records in activity_attachments on creation', () => {
      const filePath = path.resolve('src/pages/MainDashboard.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /pendingFiles\?:?\s*File\[\]/, 'handleSaveActivity signature must accept pendingFiles')
      assert.match(code, /supabase\.storage\s*\.from\('documents'\)\s*\.upload/, 'Must upload pendingFiles to documents storage bucket')
      assert.match(code, /activity_attachments.*insert/, 'Must insert attachment records in activity_attachments table')
    })
  })
})
