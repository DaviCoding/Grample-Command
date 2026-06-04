import { authRoutes } from "@modules/auth/auth.routes.js";
import { dashboardRoutes } from "@modules/dashboard/dashboard.routes.js";
import { projectsRoutes } from "@modules/projects/projects.routes.js";
import { deploymentsRoutes } from "@modules/deployments/deployments.routes.js";
export async function registerRoutes(app) {
    app.get("/health", async () => ({
        status: "ok",
        service: "grample-command"
    }));
    await app.register(authRoutes);
    await app.register(dashboardRoutes);
    await app.register(projectsRoutes, { prefix: "/projects" });
    await app.register(deploymentsRoutes, { prefix: "/deployments" });
}
