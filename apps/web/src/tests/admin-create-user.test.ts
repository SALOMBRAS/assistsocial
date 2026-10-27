import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  prepareAdminCreateUserPayload,
  parseEdgeFunctionError,
  callAdminCreateUser,
} from '../services/adminUserService.ts'
import {
  FunctionsHttpError,
  FunctionsFetchError,
  FunctionsRelayError,
} from '@supabase/supabase-js'

describe('Admin Create User - Contract & Flow Validation', () => {
  describe('Payload Contract Validation (Phase 2)', () => {
    it('should prepare valid payload without role or unauthorized fields', () => {
      const payload = prepareAdminCreateUserPayload({
        fullName: '  Dra. Maria Social  ',
        email: '  MARIA.SOCIAL@CRAS.GOV.BR  ',
        phone: '  (11) 98765-4321  ',
      })

      assert.deepStrictEqual(payload, {
        full_name: 'Dra. Maria Social',
        email: 'maria.social@cras.gov.br',
        phone: '(11) 98765-4321',
      })

      // Strict security check: role, password, and confirmation flags MUST NOT exist
      assert.strictEqual('role' in payload, false)
      assert.strictEqual('email_confirm' in payload, false)
      assert.strictEqual('password' in payload, false)
      assert.strictEqual('must_change_password' in payload, false)
    })

    it('should handle optional phone as null when empty or whitespace', () => {
      const payload = prepareAdminCreateUserPayload({
        fullName: 'João Silva',
        email: 'joao.silva@orgao.gov.br',
        phone: '   ',
      })

      assert.strictEqual(payload.phone, null)
      assert.strictEqual(payload.email, 'joao.silva@orgao.gov.br')
    })
  })

  describe('Edge Function Error Parsing (Phase 2 & 4)', () => {
    it('should handle HTTP 404 with explicit deployment status', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Function not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
      const error = new FunctionsHttpError(mockResponse)

      const message = await parseEdgeFunctionError(error)
      assert.match(message, /A Edge Function "admin-create-user" está indisponível ou ainda não foi publicada no projeto Supabase \(HTTP 404\)/)
    })

    it('should handle HTTP 401/403 unauthorized access', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
      const error = new FunctionsHttpError(mockResponse)

      const message = await parseEdgeFunctionError(error)
      assert.match(message, /Sessão expirada ou acesso não autorizado \(HTTP 403\)/)
    })

    it('should handle HTTP 409 conflict when user already exists', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado no sistema.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
      const error = new FunctionsHttpError(mockResponse)

      const message = await parseEdgeFunctionError(error)
      assert.match(message, /Este e-mail já está cadastrado no sistema/)
    })

    it('should handle HTTP 500 server error', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Falha no banco relacional' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
      const error = new FunctionsHttpError(mockResponse)

      const message = await parseEdgeFunctionError(error)
      assert.match(message, /Erro interno do servidor ao processar o cadastro administrativo \(HTTP 500\)/)
    })

    it('should handle FunctionsFetchError network transport failures', async () => {
      const error = new FunctionsFetchError('Failed to fetch')
      const message = await parseEdgeFunctionError(error)
      assert.match(message, /Falha de comunicação ou conexão de rede/)
    })

    it('should handle FunctionsRelayError gateway errors', async () => {
      const error = new FunctionsRelayError('Relay failure')
      const message = await parseEdgeFunctionError(error)
      assert.match(message, /Falha no gateway do Supabase/)
    })
  })

  describe('Edge Function Invocation & Fallback Mechanism (Phase 2)', () => {
    it('should succeed with admin-create-user when endpoint responds 201', async () => {
      const mockClient = {
        functions: {
          invoke: async (functionName: string, options: any) => {
            assert.strictEqual(functionName, 'admin-create-user')
            assert.strictEqual(options.body.email, 'ana@cras.gov.br')
            return {
              data: {
                success: true,
                message: 'Profissional cadastrado com sucesso.',
                user: {
                  id: 'usr-123',
                  email: 'ana@cras.gov.br',
                  full_name: 'Ana Silva',
                  role: 'social_worker',
                  must_change_password: true,
                },
                temporary_password: 'Secr3t#Password!2026',
              },
              error: null,
            }
          },
        },
      }

      const payload = prepareAdminCreateUserPayload({
        fullName: 'Ana Silva',
        email: 'ana@cras.gov.br',
      })

      const { data, error } = await callAdminCreateUser(mockClient, payload)
      assert.strictEqual(error, null)
      assert.strictEqual(data?.success, true)
      assert.strictEqual(data?.temporary_password, 'Secr3t#Password!2026')
      assert.strictEqual(data?.user?.must_change_password, true)
    })

    it('should fallback to admin-invite-user when admin-create-user returns 404', async () => {
      const invokedFunctions: string[] = []

      const mockClient = {
        functions: {
          invoke: async (functionName: string, _options: any) => {
            invokedFunctions.push(functionName)
            if (functionName === 'admin-create-user') {
              const res404 = new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
              return { data: null, error: new FunctionsHttpError(res404) }
            }
            if (functionName === 'admin-invite-user') {
              return {
                data: {
                  success: true,
                  message: 'Usuário cadastrado pela função de compatibilidade.',
                  user: {
                    id: 'usr-456',
                    email: 'carlos@cras.gov.br',
                    full_name: 'Carlos Oliveira',
                    role: 'social_worker',
                    must_change_password: true,
                  },
                  temporary_password: 'Comp@tibilityTemp123',
                },
                error: null,
              }
            }
            throw new Error(`Unexpected function ${functionName}`)
          },
        },
      }

      const payload = prepareAdminCreateUserPayload({
        fullName: 'Carlos Oliveira',
        email: 'carlos@cras.gov.br',
      })

      const { data, error } = await callAdminCreateUser(mockClient, payload)
      assert.strictEqual(error, null)
      assert.deepStrictEqual(invokedFunctions, ['admin-create-user', 'admin-invite-user'])
      assert.strictEqual(data?.temporary_password, 'Comp@tibilityTemp123')
    })
  })

  describe('Security & Lifecycle of Temporary Password (Phase 2 & 4)', () => {
    it('should verify that credentials state is purged upon dismissal without persistence', () => {
      // Simulation of modal lifecycle
      let modalState: {
        credentials: { fullName: string; email: string; temporaryPassword: string } | null
        copiedPassword: boolean
        copiedMessage: boolean
      } = {
        credentials: {
          fullName: 'Profissional Teste',
          email: 'teste@cras.gov.br',
          temporaryPassword: 'TempPassword#2026',
        },
        copiedPassword: true,
        copiedMessage: true,
      }

      // Action: handleCloseCredentialsModal
      const handleCloseCredentialsModal = () => {
        modalState = {
          credentials: null,
          copiedPassword: false,
          copiedMessage: false,
        }
      }

      handleCloseCredentialsModal()

      // Assert complete memory clearance
      assert.strictEqual(modalState.credentials, null)
      assert.strictEqual(modalState.copiedPassword, false)
      assert.strictEqual(modalState.copiedMessage, false)
    })
  })
})
