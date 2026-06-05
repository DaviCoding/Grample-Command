import type { Project } from "./entities/project.entity.js";

export const defaultProjects: Project[] = [
  {
    id: "grample-backend",
    name: "Grample Backend",
    repository: "https://github.com/DaviCoding/Grample-Backend.git",
    directory: "grample-backend",
    branch: "main",
    composeFile: "docker-compose.command.yml",
    healthcheckUrl: "http://grample-node:1000/api/health",
    databaseUrlEnv: "DATABASE_URL",
    enabled: true
  },
  {
    id: "grample-renderer",
    name: "Grample Renderer",
    repository: "https://github.com/DaviCoding/Grample-Renderer.git",
    directory: "grample-renderer",
    branch: "main",
    composeFile: "docker-compose.yml",
    healthcheckUrl: "http://grample-renderer:2000/_health",
    databaseUrlEnv: null,
    enabled: true
  },
  {
    id: "grample-frontend",
    name: "Grample Frontend",
    repository: "https://github.com/DaviCoding/Grample-Frontend.git",
    directory: "grample-frontend",
    branch: "main",
    composeFile: "docker-compose.command.yml",
    healthcheckUrl: "http://grample-frontend:3000",
    databaseUrlEnv: null,
    enabled: true
  }
];
