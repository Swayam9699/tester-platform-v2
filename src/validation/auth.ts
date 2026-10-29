import { z } from "zod";
import { email } from "./fields";

export const emailSignInSchema = z.object({ email: email() });
export type EmailSignInInput = z.input<typeof emailSignInSchema>;

export const emailCodeSchema = z.object({
  email: email(),
  code: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6,12}$/, "Enter the code from the email.")),
});
export type EmailCodeInput = z.input<typeof emailCodeSchema>;

export const demoSignInSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email.")),
  name: z.string().trim().max(60).optional().default(""),
});
export type DemoSignInInput = z.input<typeof demoSignInSchema>;
