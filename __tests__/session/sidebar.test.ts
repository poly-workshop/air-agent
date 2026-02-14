import { describe, it, expect } from "vitest"
import { formatRelativeTime } from "@/components/session-sidebar"

describe("formatRelativeTime", () => {
  it("returns '刚刚' for timestamps less than 60 seconds ago", () => {
    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toBe("刚刚")
  })

  it("returns minutes for timestamps 1-59 minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(formatRelativeTime(fiveMinAgo)).toBe("5 分钟前")
  })

  it("returns hours for timestamps 1-23 hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(twoHoursAgo)).toBe("2 小时前")
  })

  it("returns days for timestamps 1-29 days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(threeDaysAgo)).toBe("3 天前")
  })

  it("returns months for timestamps 30-364 days ago", () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(twoMonthsAgo)).toBe("2 个月前")
  })

  it("returns years for timestamps over 12 months ago", () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(twoYearsAgo)).toBe("2 年前")
  })
})
