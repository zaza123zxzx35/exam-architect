import { htmlPlannerLinkInventory } from '../../data/htmlPlannerData.js'
import { initialVideos } from '../../data/videoData.js'

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/$/, '')
}

/**
 * Account for every HTML planner link vs the English video library.
 * Statuses: imported | duplicate | also-in-videos | incomplete | malformed
 * Never drops a link.
 */
export function buildHtmlResourceAccounting(videos = initialVideos) {
  const videoUrlCounts = new Map()
  for (const video of videos) {
    const key = normalizeUrl(video.url)
    if (!key) continue
    videoUrlCounts.set(key, (videoUrlCounts.get(key) || 0) + 1)
  }

  const plannerUrlCounts = new Map()
  for (const row of htmlPlannerLinkInventory) {
    const key = normalizeUrl(row.url)
    plannerUrlCounts.set(key, (plannerUrlCounts.get(key) || 0) + 1)
  }

  const rows = htmlPlannerLinkInventory.map((row, index) => {
    const key = normalizeUrl(row.url)
    let status = row.status || 'imported'
    const flags = []

    if (status === 'malformed') {
      flags.push('malformed')
    }

    const plannerCount = plannerUrlCounts.get(key) || 0
    if (plannerCount > 1) {
      status = 'duplicate'
      flags.push('duplicate-in-planner')
    }

    const videoCount = videoUrlCounts.get(key) || 0
    if (videoCount > 0) {
      flags.push('also-in-videos')
      if (videoCount > 1) flags.push('duplicate-in-videos')
    } else if (status !== 'malformed') {
      // Present in planner seed but not in English video catalog
      flags.push('not-in-video-library')
      if (status === 'imported') status = 'incomplete'
    }

    if (/[?&]u_id=/i.test(row.url)) {
      flags.push('contains-u_id')
    }

    return {
      id: `html-link-${index}`,
      url: row.url,
      title: row.title,
      source: row.source,
      dayIndex: row.dayIndex,
      taskIndex: row.taskIndex,
      status,
      flags,
    }
  })

  const uniqueUrls = [...new Set(rows.map(r => normalizeUrl(r.url)))]
  const notInVideos = uniqueUrls.filter(u => !videoUrlCounts.has(u))

  return {
    rows,
    summary: {
      inventoryRows: rows.length,
      uniqueUrls: uniqueUrls.length,
      notInVideoLibraryUnique: notInVideos.length,
      duplicatePlannerRows: rows.filter(r => r.status === 'duplicate').length,
      malformed: rows.filter(r => r.status === 'malformed').length,
      withUidFlag: rows.filter(r => r.flags.includes('contains-u_id')).length,
      importantLinkRows: rows.filter(r => r.source === 'importantLinks').length,
      dailyPlanLinkRows: rows.filter(r => r.source === 'dailyPlan').length,
    },
    notInVideoLibraryUrls: notInVideos,
  }
}
