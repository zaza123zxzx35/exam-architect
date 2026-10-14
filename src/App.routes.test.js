import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

describe('App routes for M2 pages', () => {
  it('registers today/overview/history/resources routes', () => {
    const appSrc = fs.readFileSync(path.join(root, 'App.jsx'), 'utf8')
    for (const route of ['/today', '/overview', '/history', '/resources']) {
      expect(appSrc).toContain(`path="${route}"`)
    }
  })

  it('exposes the four pages in navigation', () => {
    const layoutSrc = fs.readFileSync(path.join(root, 'components/Layout.jsx'), 'utf8')
    for (const route of ['/today', '/overview', '/history', '/resources']) {
      expect(layoutSrc).toContain(`to: '${route}'`)
    }
  })
})
