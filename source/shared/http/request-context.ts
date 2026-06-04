import type { FastifyRequest } from "fastify";

export function getRequestIp(request: FastifyRequest) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() ?? request.ip;
  }

  return request.ip;
}

export function getUserAgent(request: FastifyRequest) {
  const userAgent = request.headers["user-agent"];
  return typeof userAgent === "string" ? userAgent : "unknown";
}

export function isBrowserNavigation(request: FastifyRequest) {
  const accept = request.headers.accept;
  return typeof accept === "string" && accept.includes("text/html");
}
