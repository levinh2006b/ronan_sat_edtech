import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnswer {
    questionId: mongoose.Types.ObjectId;
    userAnswer?: string;
    isCorrect: boolean;
    errorReason?: string;
}

export interface IResult extends Document {
    userId: mongoose.Types.ObjectId;
    testId: mongoose.Types.ObjectId;
    isSectional?: boolean;
    sectionalSubject?: string;
    sectionalModule?: number;
    answers: IAnswer[];
    score?: number;
    sectionBreakdown?: {
        readingAndWriting?: number;
        math?: number;
    };
    totalScore?: number;
    readingScore?: number;
    mathScore?: number;
    date: Date;
    createdAt?: Date;
}

const AnswerSchema: Schema<IAnswer> = new Schema({
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    userAnswer: { type: String, required: false, default: "Omitted" },
    isCorrect: { type: Boolean, required: true },
    errorReason: { type: String, required: false, trim: true, maxlength: 60 },
});

const ResultSchema: Schema<IResult> = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        testId: { type: Schema.Types.ObjectId, ref: "Test", required: true },
        isSectional: { type: Boolean, default: false },
        sectionalSubject: { type: String, required: false },
        sectionalModule: { type: Number, required: false },

        answers: [AnswerSchema],

        score: { type: Number, required: false },
        sectionBreakdown: {
            readingAndWriting: { type: Number, required: false },
            math: { type: Number, required: false },
        },

        totalScore: { type: Number, required: false },
        readingScore: { type: Number, required: false },
        mathScore: { type: Number, required: false },

        date: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

ResultSchema.index({ createdAt: -1, score: -1 });
ResultSchema.index({ userId: 1 });
ResultSchema.index({ userId: 1, isSectional: 1, createdAt: -1 });

const Result: Model<IResult> = mongoose.models.Result || mongoose.model<IResult>("Result", ResultSchema);
export default Result;
