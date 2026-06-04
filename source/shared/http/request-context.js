export function getRequestIp(request) {
    const forwardedFor = request.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string") {
        return forwardedFor.split(",")[0]?.trim() ?? request.ip;
    }
    return request.ip;
}
export function getUserAgent(request) {
    const userAgent = request.headers["user-agent"];
    return typeof userAgent === "string" ? userAgent : "unknown";
}
export function isBrowserNavigation(request) {
    const accept = request.headers.accept;
    return typeof accept === "string" && accept.includes("text/html");
}
