/**
 * Domain validator to check if a URL's domain is allowed based on ALLOWED_DOMAINS environment variable
 */

/**
 * Parse ALLOWED_DOMAINS environment variable into an array of domain patterns
 * @returns Array of domain patterns, or null if ALLOWED_DOMAINS is empty/not set
 */
export function getAllowedDomains(): string[] | null {
  const allowedDomainsEnv = process.env.ALLOWED_DOMAINS?.trim()
  
  if (!allowedDomainsEnv) {
    return null // Allow all domains if not set
  }
  
  return allowedDomainsEnv
    .split(',')
    .map(domain => domain.trim())
    .filter(domain => domain.length > 0)
}

/**
 * Check if a domain matches a pattern (supports wildcard *)
 * @param domain - The domain to check
 * @param pattern - The pattern to match against (supports * wildcard)
 * @returns true if the domain matches the pattern
 */
function matchDomainPattern(domain: string, pattern: string): boolean {
  // Convert wildcard pattern to regex
  // Escape special regex characters except *
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape special chars
    .replace(/\*/g, '.*')  // Convert * to .*
  
  const regex = new RegExp(`^${regexPattern}$`, 'i') // Case insensitive
  return regex.test(domain)
}

/**
 * Extract hostname from a URL string
 * @param url - The URL to extract hostname from
 * @returns The hostname, or null if invalid
 */
function extractHostname(url: string): string | null {
  try {
    // Ensure URL has a protocol
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`
    }
    
    const urlObj = new URL(url)
    return urlObj.hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Validate if a URL's domain is allowed
 * @param url - The URL to validate
 * @returns true if the domain is allowed, false otherwise
 */
export function isUrlAllowed(url: string): boolean {
  const allowedDomains = getAllowedDomains()
  
  // If ALLOWED_DOMAINS is not set or empty, allow all
  if (!allowedDomains || allowedDomains.length === 0) {
    return true
  }
  
  const hostname = extractHostname(url)
  
  // If we can't extract a valid hostname, reject
  if (!hostname) {
    return false
  }
  
  // Check if hostname matches any of the allowed patterns
  return allowedDomains.some(pattern => matchDomainPattern(hostname, pattern))
}

/**
 * Validate URL and throw error if not allowed
 * @param url - The URL to validate
 * @throws Error if the URL's domain is not allowed
 */
export function validateUrlDomain(url: string): void {
  if (!isUrlAllowed(url)) {
    const allowedDomains = getAllowedDomains()
    throw new Error(
      `Domain not allowed. URL domain must match one of the allowed patterns: ${allowedDomains?.join(', ')}`
    )
  }
}
