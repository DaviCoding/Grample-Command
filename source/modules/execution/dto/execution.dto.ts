export type ExecutionAction = "start" | "stop" | "restart" | "rebuild" | "down";

export type ContainerStatus = {
  id?: string;
  name: string;
  service: string;
  image?: string;
  state: string;
  health?: string;
  status?: string;
  ports?: string;
};

export type ProjectExecutionStatus = {
  projectId: string;
  projectName: string;
  path: string;
  composeFile: string;
  exists: boolean;
  healthy: boolean;
  state: "not_initialized" | "online" | "offline" | "partial" | "error";
  containers: ContainerStatus[];
  logs: string[];
  error?: string;
};
