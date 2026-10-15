import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

describe('App routes for planner pages', () => {
  it('registers today/overview/history/resources/planner/library routes', () => {
    const appSrc = fs.readFileSync(path.join(root, 'App.jsx'), 'utf8')
    for (const route of ['/today', '/overview', '/history', '/resources', '/planner', '/assistant', '/library']) {
      expect(appSrc).toContain(`path="${route}"`)
    }
  })

  it('exposes planner pages in navigation', () => {
    const layoutSrc = fs.readFileSync(path.join(root, 'components/Layout.jsx'), 'utf8')
    for (const route of ['/today', '/overview', '/history', '/resources', '/planner', '/assistant', '/library']) {
      expect(layoutSrc).toContain(`to: '${route}'`)
    }
  })
})
