import { DashboardController } from "./controllers/dashboard.controller.js";
export async function dashboardRoutes(app) {
    const controller = new DashboardController();
    app.get("/", controller.index.bind(controller));
}
