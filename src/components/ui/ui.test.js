import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))

describe('ui foundation exports', () => {
  it('exposes shared primitives from the barrel', async () => {
    const mod = await import('./index.js')
    expect(typeof mod.PageHeader).toBe('function')
    expect(typeof mod.EmptyState).toBe('function')
    expect(typeof mod.StatusBanner).toBe('function')
    expect(typeof mod.FilterChips).toBe('function')
  })

  it('FilterChips keeps option ids stable for unknown/mixed filters', () => {
    const source = readFileSync(join(dir, 'FilterChips.jsx'), 'utf8')
    expect(source).toContain('aria-pressed')
    expect(source).toContain('onChange(id)')
  })
})
