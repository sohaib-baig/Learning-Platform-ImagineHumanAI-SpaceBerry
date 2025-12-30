import { env } from "./env";

/**
 * Supported analytics event names
 */
type EventName =
  | "signup_google"
  | "signup_email"
  | "signin_google"
  | "signin_email"
  | "view_dashboard"
  | "view_classroom"
  | "view_course"
  | "view_lesson"
  | "play_video"
  | "pause_video"
  | "seek_video"
  | "progress_saved"
  | "complete_lesson"
  | "complete_course"
  | "view_downloads"
  | "download_resource"
  | "admin_update_notice"
  | "admin_update_today_read"
  | "admin_publish_course";

/**
 * Analytics wrapper
 */
type AmplitudeBrowser = typeof import("@amplitude/analytics-browser");

class Analytics {
  private amplitude: AmplitudeBrowser | null = null;
  private initPromise: Promise<void> | null = null;

  private shouldInitialize() {
    return (
      typeof window !== "undefined" &&
      Boolean(env.NEXT_PUBLIC_AMPLITUDE_API_KEY)
    );
  }

  private async ensureClient(): Promise<AmplitudeBrowser | null> {
    if (this.amplitude) {
      return this.amplitude;
    }

    if (!this.shouldInitialize()) {
      return null;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.amplitude;
    }

    this.initPromise = import("@amplitude/analytics-browser")
      .then((module) => {
        if (!env.NEXT_PUBLIC_AMPLITUDE_API_KEY) {
          return;
        }
        module.init(env.NEXT_PUBLIC_AMPLITUDE_API_KEY, {
          defaultTracking: {
            sessions: true,
            pageViews: true,
            formInteractions: true,
            fileDownloads: true,
          },
        });
        this.amplitude = module;
      })
      .catch((error) => {
        console.error("Failed to initialize analytics", error);
      })
      .finally(() => {
        this.initPromise = null;
      });

    await this.initPromise;
    return this.amplitude;
  }

  /**
   * Track an event
   */
  track(eventName: EventName | string, properties?: Record<string, unknown>) {
    if (!this.shouldInitialize()) {
      return;
    }

    void this.ensureClient().then((client) => {
      try {
        client?.track(eventName, properties);
      } catch (error) {
        console.error(`Failed to track event: ${eventName}`, error);
      }
    });
  }

  /**
   * Set user id for tracking
   */
  setUserId(userId: string | null) {
    if (!this.shouldInitialize()) {
      return;
    }

    void this.ensureClient().then((client) => {
      try {
        if (!client) {
          return;
        }
        if (userId) {
          client.setUserId(userId);
        } else {
          client.reset();
        }
      } catch (error) {
        console.error("Failed to set user id", error);
      }
    });
  }
}

export const analytics = new Analytics();

/**
 * Safe event tracking function
 * No-ops when Amplitude is not configured
 */
export function trackEvent(
  name: string,
  props?: Record<string, unknown>
): void {
  if (!env.NEXT_PUBLIC_AMPLITUDE_API_KEY) {
    return; // No-op when Amplitude is not configured
  }

  analytics.track(name, props);
}
