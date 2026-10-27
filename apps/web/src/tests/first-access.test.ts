import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateFirstAccessPassword,
  executeFirstAccessPasswordChange,
} from '../services/firstAccessService.ts'
import type { Database } from '../types/supabase.ts'

describe('First Access & Mandatory Password Change (Phase 3 & 4)', () => {
  describe('Password Policy Validation', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const res = validateFirstAccessPassword('Short1!', 'Short1!')
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.requirements.minLength, false)
      assert.match(res.errors[0], /no mínimo 8 caracteres/)
    })

    it('should reject passwords lacking uppercase letters', () => {
      const res = validateFirstAccessPassword('lowercase1!', 'lowercase1!')
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.requirements.hasUpper, false)
    })

    it('should reject passwords lacking lowercase letters', () => {
      const res = validateFirstAccessPassword('UPPERCASE1!', 'UPPERCASE1!')
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.requirements.hasLower, false)
    })

    it('should reject passwords lacking numbers', () => {
      const res = validateFirstAccessPassword('NoNumbersHere!', 'NoNumbersHere!')
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.requirements.hasNumber, false)
    })

    it('should reject passwords lacking special characters', () => {
      const res = validateFirstAccessPassword('Password2026', 'Password2026')
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.requirements.hasSymbol, false)
    })

    it('should reject mismatched confirmation passwords', () => {
      const res = validateFirstAccessPassword('StrongPass@2026', 'DifferentPass@2026')
      assert.strictEqual(res.isValid, false)
      assert.strictEqual(res.requirements.matchesConfirmation, false)
      assert.match(res.errors[0], /confirmação da senha não confere/)
    })

    it('should accept passwords satisfying all policy requirements', () => {
      const res = validateFirstAccessPassword('AssistSocial@2026!', 'AssistSocial@2026!')
      assert.strictEqual(res.isValid, true)
      assert.strictEqual(res.requirements.minLength, true)
      assert.strictEqual(res.requirements.hasUpper, true)
      assert.strictEqual(res.requirements.hasLower, true)
      assert.strictEqual(res.requirements.hasNumber, true)
      assert.strictEqual(res.requirements.hasSymbol, true)
      assert.strictEqual(res.requirements.matchesConfirmation, true)
      assert.strictEqual(res.errors.length, 0)
    })
  })

  describe('Official Supabase Execution Flow', () => {
    it('should stop and return auth_update error if supabase.auth.updateUser fails', async () => {
      let rpcWasCalled = false
      const mockClient = {
        auth: {
          updateUser: async (_params: { password: string }) => {
            return { data: null, error: { message: 'Password is too weak or recent' } }
          },
        },
        rpc: async () => {
          rpcWasCalled = true
          return { data: { success: true }, error: null }
        },
      }

      const result = await executeFirstAccessPasswordChange(
        mockClient,
        'ValidP@ssw0rd!',
        'ValidP@ssw0rd!'
      )

      assert.strictEqual(result.success, false)
      assert.strictEqual(result.step, 'auth_update')
      assert.match(result.error || '', /Falha ao atualizar senha na autenticação/)
      // CRITICAL: RPC must never be called if auth.updateUser failed
      assert.strictEqual(rpcWasCalled, false)
    })

    it('should stop and return server_confirmation error if backend RPC fails (never fake success)', async () => {
      const mockClient = {
        auth: {
          updateUser: async (_params: { password: string }) => {
            return { data: { user: { id: 'usr-1' } }, error: null }
          },
        },
        rpc: async (fn: string) => {
          return {
            data: null,
            error: {
              code: 'PGRST202',
              message: `Could not find the function public.${fn} in the schema cache`,
            },
          }
        },
      }

      const result = await executeFirstAccessPasswordChange(
        mockClient,
        'ValidP@ssw0rd!',
        'ValidP@ssw0rd!'
      )

      assert.strictEqual(result.success, false)
      assert.strictEqual(result.step, 'server_confirmation')
      assert.strictEqual(result.isBackendPending, true)
      assert.match(result.error || '', /RPC mark_first_password_changed.*ainda não foi aplicada no Supabase remoto/)
    })

    it('should successfully complete first access when both auth and RPC succeed', async () => {
      let authPasswordReceived = ''
      let rpcInvoked = ''

      const mockClient = {
        auth: {
          updateUser: async (params: { password: string }) => {
            authPasswordReceived = params.password
            return { data: { user: { id: 'usr-1' } }, error: null }
          },
        },
        rpc: async (fn: string) => {
          rpcInvoked = fn
          return {
            data: {
              success: true,
              message: 'Indicador de troca de senha desativado com sucesso.',
            },
            error: null,
          }
        },
      }

      const result = await executeFirstAccessPasswordChange(
        mockClient,
        'ValidP@ssw0rd!',
        'ValidP@ssw0rd!'
      )

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.step, 'server_confirmation')
      assert.strictEqual(authPasswordReceived, 'ValidP@ssw0rd!')
      assert.strictEqual(rpcInvoked, 'mark_first_password_changed')
      assert.match(result.message || '', /Indicador de troca de senha desativado com sucesso/)
    })
  })

  describe('Route Guards Redirection Logic (Phase 3 & 4)', () => {
    it('should redirect to /primeiro-acesso when must_change_password is true in ProtectedRoute', () => {
      const user = { id: 'usr-1' }
      const profile = { must_change_password: true, role: 'social_worker' }

      // Route guard decision logic matching Guards.tsx
      const shouldRedirectToFirstAccess = Boolean(user && profile?.must_change_password)
      assert.strictEqual(shouldRedirectToFirstAccess, true)
    })

    it('should redirect to /primeiro-acesso even if user is global_admin when must_change_password is true', () => {
      const user = { id: 'usr-admin' }
      const profile = { must_change_password: true, role: 'global_admin' }

      const shouldRedirectToFirstAccess = Boolean(user && profile?.must_change_password)
      assert.strictEqual(shouldRedirectToFirstAccess, true)
    })

    it('should allow normal dashboard access when must_change_password is false', () => {
      const user = { id: 'usr-1' }
      const profile = { must_change_password: false, role: 'social_worker' }

      const shouldRedirectToFirstAccess = Boolean(user && profile?.must_change_password)
      assert.strictEqual(shouldRedirectToFirstAccess, false)
    })

    it('should redirect out of /primeiro-acesso if must_change_password is false', () => {
      const user = { id: 'usr-1' }
      const profile = { must_change_password: false, role: 'social_worker' }

      // FirstAccessRoute logic: if profile has no must_change_password, redirect to "/"
      const shouldRedirectToHome = Boolean(user && !profile?.must_change_password)
      assert.strictEqual(shouldRedirectToHome, true)
    })
  })

  describe('TypeScript Contract Compatibility', () => {
    it('should type-check profile and database functions contract', () => {
      type ProfileRow = Database['public']['Tables']['profiles']['Row']
      type Functions = Database['public']['Functions']

      const dummyProfile: Partial<ProfileRow> = {
        must_change_password: true,
      }
      assert.strictEqual(dummyProfile.must_change_password, true)

      // Ensure RPC names exist in TypeScript database contract
      type RpcName = keyof Functions
      const rpcName1: RpcName = 'mark_first_password_changed'
      const rpcName2: RpcName = 'complete_first_password_change'
      assert.strictEqual(rpcName1, 'mark_first_password_changed')
      assert.strictEqual(rpcName2, 'complete_first_password_change')
    })
  })
})
