export type AuditStatus = "success" | "failure";

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId?: string;
  status: AuditStatus;
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
