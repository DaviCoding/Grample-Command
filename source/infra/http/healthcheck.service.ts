export class HealthcheckService {
  async check(url?: string | null) {
    if (!url) {
      return {
        skipped: true,
        ok: true,
        status: 0,
        message: "Healthcheck skipped."
      };
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(15000)
      });

      return {
        skipped: false,
        ok: response.ok,
        status: response.status,
        message: response.ok ? "Healthcheck passed." : "Healthcheck failed."
      };
    } catch (error) {
      return {
        skipped: false,
        ok: false,
        status: 0,
        message: error instanceof Error ? error.message : "Healthcheck failed."
      };
    }
  }
}
