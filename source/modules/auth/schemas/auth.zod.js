import { z } from "zod";
export const signInSchema = z.object({
    username: z.string().trim().min(1),
    password: z.string().min(1),
    _csrf: z.string().min(1)
});
