/**
 * MCP Server configuration storage utilities
 */

import { McpServerConfig } from "./types"
import { MCP_STORAGE_KEY } from "../constants"

/**
 * Load all MCP server configurations from localStorage
 */
export function loadMcpServers(): McpServerConfig[] {
  try {
    const stored = localStorage.getItem(MCP_STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error("Failed to load MCP servers from storage:", error)
    return []
  }
}

/**
 * Save MCP server configurations to localStorage
 */
export function saveMcpServers(servers: McpServerConfig[]): void {
  try {
    localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(servers))
  } catch (error) {
    console.error("Failed to save MCP servers to storage:", error)
    throw error
  }
}

/**
 * Add or update an MCP server configuration
 */
export function saveMcpServer(server: McpServerConfig): void {
  const servers = loadMcpServers()
  const index = servers.findIndex((s) => s.id === server.id)
  
  if (index >= 0) {
    // Preserve the original createdAt when updating
    servers[index] = {
      ...server,
      createdAt: servers[index].createdAt,
      updatedAt: new Date().toISOString(),
    }
  } else {
    servers.push({
      ...server,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
  
  saveMcpServers(servers)
}

/**
 * Remove an MCP server configuration
 */
export function removeMcpServer(serverId: string): void {
  const servers = loadMcpServers()
  const filtered = servers.filter((s) => s.id !== serverId)
  saveMcpServers(filtered)
}

/**
 * Get a specific MCP server configuration
 */
export function getMcpServer(serverId: string): McpServerConfig | undefined {
  const servers = loadMcpServers()
  return servers.find((s) => s.id === serverId)
}

/**
 * Enable/disable an MCP server
 */
export function toggleMcpServer(serverId: string, enabled: boolean): void {
  const server = getMcpServer(serverId)
  if (server) {
    saveMcpServer({ ...server, enabled })
  }
}
