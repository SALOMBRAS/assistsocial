import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Resource Sharing & User Directory Contract (Phase 2 & 3)', () => {
  describe('User Directory Service Contract', () => {
    it('userDirectoryService should export searchDirectoryUsers and enforce query length guard', () => {
      const servicePath = path.resolve('src/services/userDirectoryService.ts')
      const code = fs.readFileSync(servicePath, 'utf8')

      assert.match(code, /export async function searchDirectoryUsers/, 'Must export searchDirectoryUsers')
      assert.match(code, /cleanQuery\.length < 2/, 'Must guard minimum 2 characters to prevent indiscriminate enumeration')
      assert.match(code, /search_users_for_sharing/, 'Must attempt official backend RPC search_users_for_sharing')
      assert.match(code, /neq\('id', currentUserId\)/, 'Must exclude current user from search results')
    })
  })

  describe('Share Service Contract & Duplicate Prevention', () => {
    it('shareService should export sendShareInvite, respondToShareInvite, fetchResourceShares, revokeResourceShare', () => {
      const servicePath = path.resolve('src/services/shareService.ts')
      const code = fs.readFileSync(servicePath, 'utf8')

      assert.match(code, /export async function sendShareInvite/, 'Must export sendShareInvite')
      assert.match(code, /export async function respondToShareInvite/, 'Must export respondToShareInvite')
      assert.match(code, /export async function fetchResourceShares/, 'Must export fetchResourceShares')
      assert.match(code, /export async function revokeResourceShare/, 'Must export revokeResourceShare')
    })

    it('sendShareInvite should prevent self-sharing and duplicate invites', () => {
      const servicePath = path.resolve('src/services/shareService.ts')
      const code = fs.readFileSync(servicePath, 'utf8')

      assert.match(code, /recipient\.id === currentUserId/, 'Must disallow sharing with oneself')
      assert.match(code, /in\('status', \['pending', 'accepted'\]\)/, 'Must check for duplicate active or pending shares')
      assert.match(code, /create_activity_share_invite/, 'Must invoke create_activity_share_invite RPC')
      assert.match(code, /create_document_share_invite/, 'Must invoke create_document_share_invite RPC')
    })

    it('respondToShareInvite should support accept and reject transitions without logout', () => {
      const servicePath = path.resolve('src/services/shareService.ts')
      const code = fs.readFileSync(servicePath, 'utf8')

      assert.match(code, /respond_to_share_invite/, 'Must invoke backend RPC respond_to_share_invite')
      assert.match(code, /action === 'accept' \? 'accepted' : 'rejected'/, 'Must update status accurately')
    })
  })

  describe('ShareModal Component Searchable Picker & Status Display', () => {
    it('ShareModal should replace plain email with searchable user picker and multi-select chips', () => {
      const modalPath = path.resolve('src/components/ShareModal.tsx')
      const code = fs.readFileSync(modalPath, 'utf8')

      assert.match(code, /searchDirectoryUsers/, 'Must integrate searchDirectoryUsers')
      assert.match(code, /selectedUsers\.map/, 'Must render selected users chips')
      assert.match(code, /handleRemoveSelectedUser/, 'Must provide remove action for selected chips')
      assert.match(code, /searchQuery\.trim\(\)\.length >= 2/, 'Must show dropdown when typing 2+ characters')
      assert.match(code, /Nenhum usuário cadastrado encontrado/, 'Must display empty state when no users found')
    })

    it('ShareModal should render real invite status badges: Pendente, Aceito, Recusado', () => {
      const modalPath = path.resolve('src/components/ShareModal.tsx')
      const code = fs.readFileSync(modalPath, 'utf8')

      assert.match(code, /share\.status === 'pending'/, 'Must detect pending status')
      assert.match(code, /share\.status === 'accepted'/, 'Must detect accepted status')
      assert.match(code, /share\.status === 'rejected'/, 'Must detect rejected status')
      assert.match(code, /Pendente/, 'Must render Pendente badge')
      assert.match(code, /Aceito/, 'Must render Aceito badge')
      assert.match(code, /Recusado/, 'Must render Recusado badge')
    })
  })
})
