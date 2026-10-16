import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

describe('App routes for planner pages', () => {
  it('registers today/overview/history/resources/planner/library/audit/review routes', () => {
    const appSrc = fs.readFileSync(path.join(root, 'App.jsx'), 'utf8')
    expect(appSrc).toContain('path="/"')
    expect(appSrc).toContain('element={<Today />}')
    expect(appSrc).toContain('path="/dashboard"')
    for (const route of ['/today', '/overview', '/history', '/resources', '/planner', '/assistant', '/library', '/audit', '/review']) {
      expect(appSrc).toContain(`path="${route}"`)
    }
  })

  it('exposes planner pages in navigation with Today as home', () => {
    const layoutSrc = fs.readFileSync(path.join(root, 'components/Layout.jsx'), 'utf8')
    expect(layoutSrc).toMatch(/to: '\/'[\s\S]*?label: 'วันนี้'/)
    expect(layoutSrc).toContain(`to: '/dashboard'`)
    for (const route of ['/overview', '/history', '/resources', '/planner', '/assistant', '/library', '/audit', '/review']) {
      expect(layoutSrc).toContain(`to: '${route}'`)
    }
  })
})
