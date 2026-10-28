import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Tab Customization & Account Persistence Contract', () => {
  const rootDir = path.resolve(process.cwd(), '../..')

  it('MainDashboard saves tab visibility to Supabase account via update_user_preferences and profiles fallback', () => {
    const dashboardPath = path.join(rootDir, 'apps/web/src/pages/MainDashboard.tsx')
    const code = fs.readFileSync(dashboardPath, 'utf8')

    assert.match(code, /update_user_preferences/, 'Must call update_user_preferences RPC')
    assert.match(code, /supabase\.from\('profiles'\)/, 'Must provide direct profiles fallback')
    assert.match(code, /preferences:\s*\{\s*hidden_tabs:\s*newHidden\s*\}/, 'Must save hidden_tabs in preferences')
    assert.match(code, /isSavingPrefs/, 'Tracks live saving state')
    assert.match(code, /lastSavedPrefsTime/, 'Displays last saved time')
    assert.match(code, /handleRestoreAllTabs/, 'Provides restore all tabs action')
  })

  it('MainDashboard loads preferences from user account in Supabase on startup', () => {
    const dashboardPath = path.join(rootDir, 'apps/web/src/pages/MainDashboard.tsx')
    const code = fs.readFileSync(dashboardPath, 'utf8')

    assert.match(code, /select\('preferences'\)/, 'Must query preferences from user profile')
    assert.match(code, /prefs\.hidden_tabs/, 'Must parse hidden_tabs array from preferences')
  })

  it('Header provides direct quick button for tab customizer', () => {
    const headerPath = path.join(rootDir, 'apps/web/src/components/Header.tsx')
    const code = fs.readFileSync(headerPath, 'utf8')

    assert.match(code, /onOpenTabCustomizer/, 'Header accepts onOpenTabCustomizer prop')
    assert.match(code, /SlidersHorizontal/, 'Uses SlidersHorizontal icon')
  })

  it('Sidebar displays count badge on Configurações when tabs are hidden', () => {
    const sidebarPath = path.join(rootDir, 'apps/web/src/components/Sidebar.tsx')
    const code = fs.readFileSync(sidebarPath, 'utf8')

    assert.match(code, /hiddenTabs\.length > 0 \? `\$\{hiddenTabs\.length\} ocultas` : undefined/, 'Displays badge with hidden count')
  })
})
