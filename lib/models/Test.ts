import mongoose, { Schema, Document, Model } from "mongoose";

export interface Section {
    name: string; // "Verbal" | "Math"
    questionsCount: number;
    timeLimit: number; // in seconds or minutes (let's use minutes for simplicity)
}

export interface ITest extends Document {
    title: string;
    timeLimit: number; // Total time limit maybe
    difficulty: string;
    sections: Section[];
    questions: mongoose.Types.ObjectId[]; // Optional, could just query questions by testId instead
}

const SectionSchema: Schema<Section> = new Schema({
    name: { type: String, required: true },
    questionsCount: { type: Number, required: true },
    timeLimit: { type: Number, required: true },
});

const TestSchema: Schema<ITest> = new Schema(
    {
        title: { type: String, required: true, index: true },
        timeLimit: { type: Number, required: true },
        difficulty: { type: String, required: true },
        sections: [SectionSchema],
        questions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
    },
    { timestamps: true }
);

const Test: Model<ITest> = mongoose.models.Test || mongoose.model<ITest>("Test", TestSchema);
export default Test;
