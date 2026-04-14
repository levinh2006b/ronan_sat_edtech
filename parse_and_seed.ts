import fs from "fs";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import Test from "./lib/models/Test";
import Question, { IQuestion } from "./lib/models/Question";

// Load environment variables manually since this is a standalone script
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in .env.local");
}

function parseText(text: string, sectionName: string): Partial<IQuestion>[] {
    text = text.replace(/\r/g, "");
    const questions: Partial<IQuestion>[] = [];

    // Split text by "Question ID " which marks the start of each new question
    const blocks = text.split(/Question ID [a-f0-9]+\n/i).filter(b => b.trim().length > 0);

    for (const block of blocks) {
        try {
            // First let's extract the ID line if it's there
            let content = block;
            const idMatch = content.match(/^ID:\s*([a-f0-9]+)\n/i);
            if (idMatch) {
                content = content.replace(idMatch[0], "");
            }

            // Look for Answer block
            const answerSplit = content.split(/ID:\s*[a-f0-9]+\s*Answer\n/i);
            if (answerSplit.length < 2) continue; // Malformed

            const questionPart = answerSplit[0].trim();
            const answerPart = answerSplit[1].trim();

            // Extract the question, passage, and choices
            const choiceRegex = /\n([A-D])\.\s/g;
            const choiceMatches = [...questionPart.matchAll(choiceRegex)];

            let passage = "";
            let questionText = "";
            const choices: string[] = [];
            
            // THÊM MỚI: Khai báo sẵn 2 biến để hứng dữ liệu
            let questionType: "multiple_choice" | "spr" = "multiple_choice";
            const sprAnswers: string[] = [];

            if (choiceMatches.length > 0) {
                // Nếu tìm thấy các lựa chọn A, B, C, D -> Đây là câu trắc nghiệm
                questionType = "multiple_choice";
                
                const textBeforeChoices = questionPart.substring(0, choiceMatches[0].index).trim();

                const lines = textBeforeChoices.split("\n");
                let qIndex = lines.length - 1;
                while (qIndex > 0) {
                    if (lines[qIndex].includes("?") || lines[qIndex].includes("______") || lines[qIndex].toLowerCase().includes("which choice") || lines[qIndex].toLowerCase().includes("based on the text")) {
                        break;
                    }
                    qIndex--;
                }

                if (qIndex > 0 && sectionName !== "Math") {
                    passage = lines.slice(0, qIndex).join("\n").trim();
                    questionText = lines.slice(qIndex).join("\n").trim();
                } else if (qIndex > 0 && sectionName === "Math" && lines.length > 3) {
                    passage = lines.slice(0, qIndex).join("\n").trim();
                    questionText = lines.slice(qIndex).join("\n").trim();
                } else {
                    questionText = textBeforeChoices;
                }

                for (let i = 0; i < choiceMatches.length; i++) {
                    const startIdx = choiceMatches[i].index! + choiceMatches[i][0].length;
                    const endIdx = i < choiceMatches.length - 1 ? choiceMatches[i + 1].index : questionPart.length;
                    const choiceText = questionPart.substring(startIdx, endIdx).trim();
                    choices.push(choiceText || "[Image/Equation missing from PDF]");
                }
            } else {
                // FIX: Nếu không có lựa chọn A,B,C,D -> Đây là câu tự luận (Grid-in/SPR)
                questionType = "spr";
                questionText = questionPart;
            }

            // Extract Correct Answer
            const correctAnswerMatch = answerPart.match(/Correct Answer:\n(.+(?:\n.+)*?)\nRationale\n/);
            let correctAnswer = "";
            let rationalePart = answerPart;
            if (correctAnswerMatch) {
                correctAnswer = correctAnswerMatch[1].trim();
                rationalePart = answerPart.substring(answerPart.indexOf("Rationale\n") + 10);
            } else if (answerPart.includes("Rationale\n")) {
                const parts = answerPart.split("Rationale\n");
                const potentialAnswer = parts[0].replace(/Correct Answer:\n?/, "").trim();
                if (potentialAnswer) correctAnswer = potentialAnswer;
                rationalePart = parts[1];
            }

            // FIX: Phân loại đáp án dựa vào loại câu hỏi
            if (questionType === "spr") {
                // Nếu là tự luận, nhét đáp án vào mảng sprAnswers
                if (correctAnswer) {
                    sprAnswers.push(correctAnswer);
                }
                correctAnswer = ""; // Xóa correctAnswer đi cho đúng chuẩn tự luận
            }

            // Extract Rationale
            const rationaleEndSplit = rationalePart.split(/\nQuestion Difficulty:\n|\nAssessment\n/);
            let explanation = rationaleEndSplit[0].trim();
            if (explanation.includes("Assessment\nSAT")) {
                explanation = explanation.split("Assessment\nSAT")[0].trim();
            }

            // Extract Difficulty
            const difficultyMatch = rationalePart.match(/Question Difficulty:\n(Easy|Medium|Hard)/i);
            let difficulty: IQuestion["difficulty"] = "medium";
            if (difficultyMatch) {
                difficulty = difficultyMatch[1].toLowerCase() as IQuestion["difficulty"];
            }

            if (!questionText) {
                console.warn(`Skipping question ${idMatch?.[1]} due to missing text`);
                continue;
            }
            // Sửa lỗi cảnh báo bỏ qua câu hỏi nếu nó là SPR và correctAnswer bị làm trống
            if (questionType === "multiple_choice" && !correctAnswer) {
                console.warn(`Skipping question ${idMatch?.[1]} due to missing correct answer`);
                continue;
            }
            if (questionType === "spr" && sprAnswers.length === 0) {
                 console.warn(`Skipping question ${idMatch?.[1]} due to missing SPR answer`);
                 continue;
            }

            if (!explanation) explanation = "No explanation provided.";

            // FIX: Đóng gói đầy đủ dữ liệu trước khi gửi lên database
            const q: Partial<IQuestion> = {
                section: sectionName,
                module: 1, // FIX: Schema yêu cầu module phải là number (required: true), nếu thiếu dòng này DB sẽ báo lỗi.
                questionType: questionType, // Đã thêm
                questionText,
                passage,
                choices, 
                correctAnswer: correctAnswer || undefined, // Nếu là chuỗi rỗng thì bỏ qua
                sprAnswers: sprAnswers, // Đã thêm
                explanation,
                difficulty,
                points: difficulty === "easy" ? 10 : (difficulty === "medium" ? 20 : 30)
            };

            questions.push(q);
        } catch (e) {
            console.warn("Failed to parse block", e);
        }
    }

    return questions;
}

async function main() {
    try {
        await mongoose.connect(MONGODB_URI as string);
        console.log("Connected to MongoDB");

        const readingText = fs.readFileSync("reading_sample.txt", "utf-8");
        const mathText = fs.readFileSync("math_sample.txt", "utf-8");

        console.log("Parsing Verbal questions...");
        const readingQuestions = parseText(readingText, "Verbal");
        console.log(`Parsed ${readingQuestions.length} Verbal questions`);

        console.log("Parsing Math questions...");
        const mathQuestions = parseText(mathText, "Math");
        console.log(`Parsed ${mathQuestions.length} Math questions`);

        const allQuestions = [...readingQuestions, ...mathQuestions];

        // Shuffle questions
        const shuffledQuestions = [...allQuestions];
        for (let i = shuffledQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
        }

        const testChunks: Partial<IQuestion>[][] = [];
        let currentChunk: Partial<IQuestion>[] = [];

        for (let i = 0; i < shuffledQuestions.length; i++) {
            currentChunk.push(shuffledQuestions[i]);
            if (currentChunk.length === 20) {
                testChunks.push(currentChunk);
                currentChunk = [];
            }
        }

        if (currentChunk.length > 0) {
            // Pad the last chunk to have 20 questions
            while (currentChunk.length < 20) {
                currentChunk.push(allQuestions[Math.floor(Math.random() * allQuestions.length)]);
            }
            testChunks.push(currentChunk);
        }

        // Clear existing data (optional, to avoid accumulating huge amounts)
        await Test.deleteMany({});
        await Question.deleteMany({});
        console.log("Cleared existing tests and questions");

        let testCount = 1;
        for (const chunk of testChunks) {
            const readingCount = chunk.filter(q => q.section === "Verbal").length;
            const mathCount = chunk.filter(q => q.section === "Math").length;

            const newTest = await Test.create({
                title: `Imported SAT Practice Test ${testCount++}`,
                sections: [
                    { name: "Verbal", questionsCount: readingCount, timeLimit: 64 },
                    { name: "Math", questionsCount: mathCount, timeLimit: 70 },
                ],
            });
            console.log(`Created new Test: ${newTest._id} (${readingCount} Verbal, ${mathCount} Math)`);

            const questionsToInsert = chunk.map(q => {
                const copy = { ...q, testId: newTest._id };
                if (!copy.passage) delete copy.passage;
                return copy;
            });

            const inserted = await Question.insertMany(questionsToInsert);
            console.log(`Inserted ${inserted.length} questions for Test ${newTest._id}`);

            newTest.questions = inserted.map(q => q._id);
            await newTest.save();
        }

        console.log("Test updated with question IDs. Seeding complete!");
        process.exit(0);

    } catch (e) {
        console.error("Error running script:", e);
        process.exit(1);
    }
}

main();
