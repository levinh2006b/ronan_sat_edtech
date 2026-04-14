import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnswer {
    questionId: mongoose.Types.ObjectId;
    userAnswer?: string; // SỬA: Thêm dấu ? để không bắt buộc
    isCorrect: boolean;
}

export interface IResult extends Document {
    userId: mongoose.Types.ObjectId;
    testId: mongoose.Types.ObjectId;
    
    // Thêm 3 biến này vào bộ khung (Interface) cho Sectional (Dấu ? nghĩa là không bắt buộc phải có)
    isSectional?: boolean;
    sectionalSubject?: string;
    sectionalModule?: number;

    answers: IAnswer[];
    
    // Điểm số giờ đây cũng không bắt buộc phải có (Thêm dấu ?)
    score?: number;
    sectionBreakdown?: {
        readingAndWriting?: number;
        math?: number;
    };

    // --- THÊM CÁC TRƯỜNG LƯU ĐIỂM CHO SECTIONAL ---
    totalScore?: number;
    readingScore?: number;
    mathScore?: number;

    date: Date;
    createdAt?: Date; // Mongoose tự động tạo ra nhờ timestamps: true
}

const AnswerSchema: Schema<IAnswer> = new Schema({
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    userAnswer: { type: String, required: false, default: "Omitted" }, // SỬA: Đổi required thành false và gán mặc định là Omitted nếu rỗng
    isCorrect: { type: Boolean, required: true },
});

const ResultSchema: Schema<IResult> = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        testId: { type: Schema.Types.ObjectId, ref: "Test", required: true },
        
        // --- CÁC TRƯỜNG MỚI DÀNH CHO SECTIONAL ---
        isSectional: { type: Boolean, default: false },       // Cờ đánh dấu có phải làm từng phần không
        sectionalSubject: { type: String, required: false },  // Stores the subject label (Verbal / Math)
        sectionalModule: { type: Number, required: false },   // Lưu số Module (1 hoặc 2)

        answers: [AnswerSchema],
        
        // --- ĐÃ ĐỔI required TỪ true THÀNH false ---
        score: { type: Number, required: false },            
        sectionBreakdown: {
            readingAndWriting: { type: Number, required: false }, 
            math: { type: Number, required: false },              
        },

        // --- CHO PHÉP MONGOOSE LƯU THÊM CÁC TRƯỜNG ĐIỂM NÀY ---
        totalScore: { type: Number, required: false },
        readingScore: { type: Number, required: false },
        mathScore: { type: Number, required: false },

        date: { type: Date, default: Date.now },
    },
    { timestamps: true } // Tính năng này tự động sinh ra trường createdAt và updatedAt
);

// ==========================================
// ĐÂY LÀ PHẦN THÊM "MỤC LỤC" (INDEX)
// ==========================================

// 1. Mục lục gộp (Compound Index) để tìm nhanh theo Ngày nộp bài giảm dần (-1) và Điểm số giảm dần (-1)
ResultSchema.index({ createdAt: -1, score: -1 });

// 2. Mục lục để tìm nhanh xem bài test này là của học sinh nào (userId)
ResultSchema.index({ userId: 1 });

// ==========================================

const Result: Model<IResult> = mongoose.models.Result || mongoose.model<IResult>("Result", ResultSchema);
export default Result;
