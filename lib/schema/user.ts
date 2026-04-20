// Info each user must have in Supabase

import { z } from "zod";

export const UserValidationSchema = z.object({
    name: z.string().optional(),
    username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/).optional(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    role: z.enum(["STUDENT", "ADMIN"]).default("STUDENT"),
    testsTaken: z.array(z.string()).optional(),
    highestScore: z.number().min(0).default(0),
    lastTestDate: z.date().optional(),
    wrongQuestions: z.array(z.string()).optional(),
    resetPasswordToken: z.string().optional(),
    resetPasswordExpires: z.date().optional(),
});

export type UserInput = z.infer<typeof UserValidationSchema>;
