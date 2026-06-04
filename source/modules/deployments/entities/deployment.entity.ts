export type DeploymentStatus = "running" | "success" | "failed" | "skipped";

export type Deployment = {
  id: string;
  projectId: string;
  projectName: string;
  status: DeploymentStatus;
  fromCommit?: string;
  toCommit?: string;
  behind?: number;
  backupFile?: string | null;
  logs: string[];
  startedAt: string;
  finishedAt?: string;
};
