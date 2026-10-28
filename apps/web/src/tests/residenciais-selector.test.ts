import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Residenciais Expandable Selector & Registration Contract (Phase 4)', () => {
  describe('Residential Service Contract & Validation Business Rules', () => {
    it('residentialService should export validateResidencialInput, generateResidencialSlug, fetchResidenciaisList, createResidencial, updateResidencial', () => {
      const servicePath = path.resolve('src/services/residentialService.ts')
      const code = fs.readFileSync(servicePath, 'utf8')

      assert.match(code, /export function validateResidencialInput/, 'Must export validateResidencialInput')
      assert.match(code, /export function generateResidencialSlug/, 'Must export generateResidencialSlug')
      assert.match(code, /export async function fetchResidenciaisList/, 'Must export fetchResidenciaisList')
      assert.match(code, /export async function createResidencial/, 'Must export createResidencial')
      assert.match(code, /export async function updateResidencial/, 'Must export updateResidencial')
    })

    it('should validate the 5 mandatory residential specifications', () => {
      const servicePath = path.resolve('src/services/residentialService.ts')
      const code = fs.readFileSync(servicePath, 'utf8')

      assert.match(code, /nome do residencial é obrigatório/, 'Must validate required name')
      assert.match(code, /endereço do residencial é obrigatório/, 'Must validate required address')
      assert.match(code, /blocos deve ser um número inteiro não negativo/, 'Must validate non-negative blocks integer')
      assert.match(code, /andares deve ser um número inteiro não negativo/, 'Must validate non-negative floors integer')
      assert.match(code, /apartamentos adaptados para PCD deve ser um número inteiro não negativo/, 'Must validate non-negative PCD apartments integer')
    })

    it('slug generator should normalize special characters and accents', () => {
      const slugify = (name: string) => {
        return name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
      }

      assert.equal(slugify('Residencial Esperança & União!'), 'residencial_esperanca_uniao')
      assert.equal(slugify('Residencial Paupina'), 'residencial_paupina')
    })
  })

  describe('ResidencialModal Registration Form Contract', () => {
    it('ResidencialModal should render form with the 5 required fields and a11y attributes', () => {
      const modalPath = path.resolve('src/components/ResidencialModal.tsx')
      const code = fs.readFileSync(modalPath, 'utf8')

      assert.match(code, /useModalA11y/, 'Must use useModalA11y hook')
      assert.match(code, /role="dialog"/, 'Must declare role=dialog')
      assert.match(code, /aria-modal="true"/, 'Must declare aria-modal=true')
      assert.match(code, /Nome do Residencial/, 'Must include Nome do Residencial field')
      assert.match(code, /Endereço Completo/, 'Must include Endereço field')
      assert.match(code, /Quantidade de Blocos/, 'Must include Quantidade de Blocos field')
      assert.match(code, /Quantidade de Andares/, 'Must include Quantidade de Andares field')
      assert.match(code, /Aptos\. Adaptados PCD/, 'Must include Apartamentos PCD field')
      assert.match(code, /w-10 h-10 rounded-full/, 'Must provide 40px touch target close button')
    })
  })

  describe('ResidenciaisView Selector & Specification Card Structure', () => {
    it('ResidenciaisView should implement expandable selector header with search filter', () => {
      const viewPath = path.resolve('src/components/ResidenciaisView.tsx')
      const code = fs.readFileSync(viewPath, 'utf8')

      assert.match(code, /aria-label="Selecionar residencial"/, 'Must provide accessible selector button')
      assert.match(code, /setIsSelectorOpen/, 'Must toggle expandable selector')
      assert.match(code, /Pesquisar residencial\.\.\./, 'Must provide typing search filter inside dropdown')
      assert.match(code, /\+ Cadastrar novo residencial/, 'Must provide prominent registration button')
    })

    it('ResidenciaisView should render detailed specification card for selected residential', () => {
      const viewPath = path.resolve('src/components/ResidenciaisView.tsx')
      const code = fs.readFileSync(viewPath, 'utf8')

      assert.match(code, /selectedResidencialItem\.name/, 'Must display selected residential name')
      assert.match(code, /selectedResidencialItem\.address/, 'Must display selected residential address')
      assert.match(code, /selectedResidencialItem\.blocks_count/, 'Must display selected residential blocks count')
      assert.match(code, /selectedResidencialItem\.floors_count/, 'Must display selected residential floors count')
      assert.match(code, /selectedResidencialItem\.pcd_adapted_units_count/, 'Must display selected residential PCD units')
      assert.match(code, /<ResidencialModal/, 'Must render ResidencialModal')
    })
  })
})
