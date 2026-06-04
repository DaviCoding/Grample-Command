import { z } from "zod";

export const signInSchema = z.object({
  text2: z.string().trim().min(1),
  text1: z.string().min(1),
  _csrf: z.string().min(1)
});

export type SignInInput = z.infer<typeof signInSchema>;
