import { ProjectsController } from "./controllers/projects.controller.js";
export async function projectsRoutes(app) {
    const controller = new ProjectsController();
    app.get("/", controller.index.bind(controller));
    app.post("/:projectId/initialize", controller.initialize.bind(controller));
    app.post("/initialize-all", controller.initializeAll.bind(controller));
}
