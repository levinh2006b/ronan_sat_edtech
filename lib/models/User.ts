import mongoose, { Schema, Document, Model } from "mongoose";
import type { ReviewReasonItem } from "@/lib/reviewReasonCatalog";
import type { VocabBoardState } from "@/lib/vocabBoard";

function normalizeOptionalUsername(value: unknown) {
    if (typeof value !== "string") {
        return value;
    }

    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function normalizeRequiredEmail(value: unknown) {
    return typeof value === "string" ? value.trim().toLowerCase() : value;
}

export interface IUser extends Document {
    name?: string;
    username?: string;
    birthDate?: string;
    email: string;
    password?: string;
    role: "STUDENT" | "PARENT" | "ADMIN";
    childrenIds: mongoose.Types.ObjectId[];
    testsTaken: mongoose.Types.ObjectId[];
    highestScore: number;
    lastTestDate?: Date;
    wrongQuestions: mongoose.Types.ObjectId[];
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    vocabBoard?: VocabBoardState;
    reviewReasonCatalog?: ReviewReasonItem[];
}

const UserSchema: Schema<IUser> = new Schema(
    {
        name: { type: String, required: false },
        username: {
            type: String,
            required: false,
            set: normalizeOptionalUsername,
            minlength: 3,
            maxlength: 20,
            match: /^[a-z0-9_]+$/,
        },
        birthDate: { type: String, required: false },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true, set: normalizeRequiredEmail },
        password: { type: String, required: false, select: false },
        role: { type: String, enum: ["STUDENT", "PARENT", "ADMIN"], default: "STUDENT" },
        childrenIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        testsTaken: [{ type: Schema.Types.ObjectId, ref: "Test" }],
        highestScore: { type: Number, default: 0 },
        lastTestDate: { type: Date },
        wrongQuestions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
        resetPasswordToken: { type: String, required: false },
        resetPasswordExpires: { type: Date, required: false },
        vocabBoard: {
            type: Schema.Types.Mixed,
            default: () => ({
                inboxIds: [],
                columns: [],
                cards: {},
            }),
        },
        reviewReasonCatalog: {
            type: Schema.Types.Mixed,
            required: false,
        },
    },
    { timestamps: true }
);

UserSchema.index(
    { username: 1 },
    {
        unique: true,
        partialFilterExpression: {
            username: { $exists: true, $type: "string", $gt: "" },
        },
    }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
