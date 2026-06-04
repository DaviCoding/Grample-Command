import { AuthController } from "./controllers/auth.controller.js";
export async function authRoutes(app) {
    const controller = new AuthController();
    app.get("/sign-in", controller.signInPage.bind(controller));
    app.post("/sign-in", controller.signIn.bind(controller));
    app.post("/sign-out", controller.signOut.bind(controller));
}
