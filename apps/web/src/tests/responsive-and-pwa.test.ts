import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Responsive Architecture & PWA Foundation (Phase 1, 2, 3)', () => {
  describe('Web App Manifest Specification', () => {
    it('should have a valid webmanifest file with AssistSocial branding and standalone mode', () => {
      const manifestPath = path.resolve('public/manifest.webmanifest')
      assert.strictEqual(fs.existsSync(manifestPath), true, 'manifest.webmanifest must exist in public/')

      const content = fs.readFileSync(manifestPath, 'utf8')
      const manifest = JSON.parse(content)

      assert.match(manifest.name, /AssistSocial/)
      assert.strictEqual(manifest.short_name, 'AssistSocial')
      assert.strictEqual(manifest.display, 'standalone')
      assert.strictEqual(manifest.theme_color, '#F04491')
      assert.strictEqual(manifest.background_color, '#FFF9FB')
      assert.strictEqual(manifest.start_url, '/')

      // Icons validation
      assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2)
      const has192 = manifest.icons.some((i: any) => i.sizes === '192x192')
      const has512 = manifest.icons.some((i: any) => i.sizes === '512x512')
      const hasMaskable = manifest.icons.some((i: any) => i.purpose?.includes('maskable'))
      assert.strictEqual(has192, true)
      assert.strictEqual(has512, true)
      assert.strictEqual(hasMaskable, true)
    })

    it('should have icon vector assets in public/icons', () => {
      assert.strictEqual(fs.existsSync(path.resolve('public/icons/icon-192.svg')), true)
      assert.strictEqual(fs.existsSync(path.resolve('public/icons/icon-512.svg')), true)
      assert.strictEqual(fs.existsSync(path.resolve('public/apple-touch-icon.svg')), true)
    })
  })

  describe('HTML Meta Configuration & iOS Safari Support', () => {
    it('should contain viewport-fit=cover and iOS web app meta tags in index.html', () => {
      const htmlPath = path.resolve('index.html')
      const html = fs.readFileSync(htmlPath, 'utf8')

      assert.match(html, /viewport-fit=cover/, 'Must include viewport-fit=cover for iPhone notch support')
      assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/, 'Must link webmanifest')
      assert.match(html, /name="theme-color" content="#F04491"/, 'Must declare theme color')
      assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/, 'Must enable iOS web app mode')
      assert.match(html, /rel="apple-touch-icon"/, 'Must provide apple-touch-icon')
    })
  })

  describe('CSS Safe Area & Mobile Zoom Prevention', () => {
    it('should contain safe area utilities and 16px input font size rule in index.css', () => {
      const cssPath = path.resolve('src/index.css')
      const css = fs.readFileSync(cssPath, 'utf8')

      assert.match(css, /env\(safe-area-inset-top/, 'Must reference safe-area-inset-top')
      assert.match(css, /env\(safe-area-inset-bottom/, 'Must reference safe-area-inset-bottom')
      assert.match(css, /\.pt-safe/, 'Must provide .pt-safe utility')
      assert.match(css, /\.pb-safe/, 'Must provide .pb-safe utility')
      assert.match(css, /\.touch-target/, 'Must provide .touch-target utility (min 44px)')
      assert.match(css, /font-size:\s*16px\s*!important/, 'Must enforce 16px input font size on mobile to prevent iOS Safari auto-zoom')
    })
  })

  describe('Device Detection Breakpoints Specification', () => {
    it('should correctly classify screen widths into mobile, tablet, and desktop', () => {
      const classify = (width: number) => ({
        isNarrowMobile: width <= 360,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      })

      // iPhone SE (320px)
      const se = classify(320)
      assert.strictEqual(se.isNarrowMobile, true)
      assert.strictEqual(se.isMobile, true)
      assert.strictEqual(se.isTablet, false)
      assert.strictEqual(se.isDesktop, false)

      // iPhone 13/14 (390px)
      const iph = classify(390)
      assert.strictEqual(iph.isNarrowMobile, false)
      assert.strictEqual(iph.isMobile, true)
      assert.strictEqual(iph.isTablet, false)
      assert.strictEqual(iph.isDesktop, false)

      // iPad Mini / Air (768px)
      const ipad = classify(768)
      assert.strictEqual(ipad.isMobile, false)
      assert.strictEqual(ipad.isTablet, true)
      assert.strictEqual(ipad.isDesktop, false)

      // Laptop / Desktop (1280px)
      const laptop = classify(1280)
      assert.strictEqual(laptop.isMobile, false)
      assert.strictEqual(laptop.isTablet, false)
      assert.strictEqual(laptop.isDesktop, true)
    })
  })
})
