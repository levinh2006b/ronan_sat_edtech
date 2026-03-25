import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    name?: string;
    email: string;
    password?: string; // Optional if using OAuth
    role: "user" | "admin";
    testsTaken: mongoose.Types.ObjectId[];
    highestScore: number;
    lastTestDate?: Date;
    wrongQuestions: mongoose.Types.ObjectId[]; // Ref to Result or Question
    resetPasswordToken?: string;  // THÊM DÒNG NÀY: Lưu mã code 6 số
    resetPasswordExpires?: Date;  // THÊM DÒNG NÀY: Lưu thời gian hết hạn của mã
}

const UserSchema: Schema<IUser> = new Schema(
    {
        name: { type: String, required: false },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: false, select: false },
        role: { type: String, enum: ["user", "admin"], default: "user" },
        testsTaken: [{ type: Schema.Types.ObjectId, ref: "Test" }],
        highestScore: { type: Number, default: 0 },
        lastTestDate: { type: Date },
        wrongQuestions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
        resetPasswordToken: { type: String, required: false },
        resetPasswordExpires: { type: Date, required: false },
    },
    { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
