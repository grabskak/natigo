import { z } from "zod";
import { isSafeNext } from "../utils/safe-next";

const MIN_PASSWORD_LEN = 8;

const NextSchema = z
  .string()
  .optional()
  .refine((value) => value === undefined || isSafeNext(value), {
    message: "Invalid next path.",
  });

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email."),
  password: z.string().min(1, "Password is required."),
  next: NextSchema,
});

export const RegisterSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email."),
    password: z.string().min(MIN_PASSWORD_LEN, `Password must be at least ${MIN_PASSWORD_LEN} characters.`),
    confirmPassword: z.string().min(1, "Confirm password is required."),
    next: NextSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const ResetPasswordRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email."),
});

export const UpdatePasswordSchema = z
  .object({
    password: z.string().min(MIN_PASSWORD_LEN, `Password must be at least ${MIN_PASSWORD_LEN} characters.`),
    confirmPassword: z.string().min(1, "Confirm password is required."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
