/**
 * Get the Mux playback source URL for a given playback ID
 */
export function getMuxPlaybackSrc(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/**
 * Get the Mux poster image URL for a given playback ID
 */
export function getMuxPosterUrl(playbackId: string): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg`;
}

/**
 * Calculate the video progress percentage
 */
export function calculateVideoProgressPercentage(
  currentTime: number, 
  duration: number
): number {
  if (!duration || duration <= 0) return 0;
  
  const percentage = (currentTime / duration) * 100;
  return Math.min(Math.max(0, percentage), 100); // Clamp between 0-100
}

/**
 * Check if video is considered complete (≥95% watched)
 */
export function isVideoCompleted(
  currentTime: number, 
  duration: number
): boolean {
  if (!duration || duration <= 0) return false;
  
  const percentage = calculateVideoProgressPercentage(currentTime, duration);
  return percentage >= 95;
}
