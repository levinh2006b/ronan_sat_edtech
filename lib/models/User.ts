import mongoose, { Schema, Document, Model } from "mongoose";
import type { VocabBoardState } from "@/lib/vocabBoard";

export interface IUser extends Document {
    name?: string;
    email: string;
    password?: string; // Optional if using OAuth
    role: "STUDENT" | "PARENT" | "ADMIN";
    childrenIds: mongoose.Types.ObjectId[];
    testsTaken: mongoose.Types.ObjectId[];
    highestScore: number;
    lastTestDate?: Date;
    wrongQuestions: mongoose.Types.ObjectId[]; // Ref to Result or Question
    resetPasswordToken?: string; // Store 6-digit reset code
    resetPasswordExpires?: Date; // Store reset code expiration time
    vocabBoard?: VocabBoardState;
}

const UserSchema: Schema<IUser> = new Schema(
    {
        name: { type: String, required: false },
        email: { type: String, required: true, unique: true },
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
    },
    { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
