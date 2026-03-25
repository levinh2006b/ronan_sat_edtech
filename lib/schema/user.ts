import { z } from "zod";

export const UserValidationSchema = z.object({
    name: z.string().optional(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    role: z.enum(["user", "admin"]).default("user"),
    testsTaken: z.array(z.string()).optional(),
    highestScore: z.number().min(0).default(0),
    lastTestDate: z.date().optional(),
    wrongQuestions: z.array(z.string()).optional(),
    resetPasswordToken: z.string().optional(),
    resetPasswordExpires: z.date().optional(),
});

export type UserInput = z.infer<typeof UserValidationSchema>;
