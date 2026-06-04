export type Project = {
  id: string;
  name: string;
  repository: string;
  directory: string;
  branch: string;
  composeFile: string;
  healthcheckUrl?: string | null;
  databaseUrlEnv?: string | null;
  enabled: boolean;
};
