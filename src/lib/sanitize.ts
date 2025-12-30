/**
 * Simple HTML sanitization to prevent XSS
 * In a production app, you would use a proper HTML sanitizer library like DOMPurify
 */
export function sanitizeHTML(html: string): string {
  // For MVP we're using a very simple sanitization approach
  // In a real app, use a proper sanitizer like DOMPurify
  
  // Remove script tags and on* attributes
  const sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/\son\w+=\w+/gi, '');
    
  return sanitized;
}

/**
 * Sanitize and limit HTML to only allow specific tags
 */
export function sanitizeTranscriptHTML(html: string): string {
  const sanitized = sanitizeHTML(html);
  
  // For a more comprehensive solution, use a proper HTML sanitizer library
  return sanitized;
}
