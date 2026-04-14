import mongoose from "mongoose";
import * as dotenv from "dotenv";
import Test from "./lib/models/Test";
import Question from "./lib/models/Question";
import 'dotenv/config'; // Dòng này sẽ kích hoạt dotenv

// Load environment variables manually since this is a standalone script
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in .env.local");
}

const sampleTest = {
    title: "Official SAT Practice Walkthrough",
    timeLimit: 134,
    difficulty: "medium",
    sections: [
        { name: "Verbal", questionsCount: 2, timeLimit: 32 },
        { name: "Math", questionsCount: 2, timeLimit: 35 },
    ],
};

const sampleQuestions = [
    {
        section: "Verbal",
        questionText: "Which choice most logically completes the text?",
        passage: "The following text is from Charlotte Brontë's 1847 novel Jane Eyre. Jane works as a governess at Thornfield Hall.\n\nI went on with my day's business tranquilly; but ever and anon vague suggestions kept wandering across my brain of reasons why I should quit Thornfield; and I kept involuntarily framing advertisements and pondering chances. These thoughts I did not think to check; they might multiply and gather to a mass: but so long as they kept entirely unmingled with my other emotions, ________",
        choices: [
            "they were of no consequence to my well-being.",
            "I was determined to suppress them entirely.",
            "they would eventually force me to leave the estate.",
            "Thornfield Hall would remain my permanent home."
        ],
        correctAnswer: "they were of no consequence to my well-being.",
        explanation: "The narrator states she did not think to check the thoughts as long as they were 'unmingled with my other emotions', implying they didn't bother her.",
        difficulty: "medium",
        points: 10,
    },
    {
        section: "Verbal",
        questionText: "As used in the text, what does the word 'framing' most nearly mean?",
        passage: "The following text is from Charlotte Brontë's 1847 novel Jane Eyre. Jane works as a governess at Thornfield Hall.\n\nI went on with my day's business tranquilly; but ever and anon vague suggestions kept wandering across my brain of reasons why I should quit Thornfield; and I kept involuntarily framing advertisements and pondering chances.",
        choices: [
            "enclosing",
            "drafting",
            "blaming",
            "exposing"
        ],
        correctAnswer: "drafting",
        explanation: "In this context, 'framing advertisements' refers to mentally drafting or composing them.",
        difficulty: "easy",
        points: 10,
    },
    {
        section: "Math",
        questionText: "If 3x - y = 12 and y = 3, what is the value of x?",
        passage: "",
        choices: [
            "3",
            "4",
            "5",
            "15"
        ],
        correctAnswer: "5",
        explanation: "Substitute y = 3 into the equation: 3x - 3 = 12. Add 3 to both sides to get 3x = 15. Divide by 3 to get x = 5.",
        difficulty: "easy",
        points: 10,
    },
    {
        section: "Math",
        questionText: "A food truck sells salads for $6.50 each and drinks for $2.00 each. The food truck's revenue from selling a total of 209 salads and drinks in one day was $836.50. How many salads were sold that day?",
        passage: "",
        choices: [
            "77",
            "93",
            "99",
            "105"
        ],
        correctAnswer: "93",
        explanation: "Let s be the number of salads and d be drinks. \ns + d = 209 \n6.50s + 2.00d = 836.50 \nMultiply the first by 2: 2s + 2d = 418. \nSubtract from the second equation: 4.5s = 418.5 \ns = 93.",
        difficulty: "hard",
        points: 10,
    }
];

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI as string);
        console.log("Connected to MongoDB");

        // Clear existing data (optional, but good for pure seed)
        // await Test.deleteMany({});
        // await Question.deleteMany({});

        // Create Test
        const newTest = await Test.create(sampleTest);
        console.log(`Created test: ${newTest.title}`);

        // Create Questions
        const questionsWithTestId = sampleQuestions.map(q => ({
            ...q,
            testId: newTest._id
        }));

        const insertedQuestions = await Question.insertMany(questionsWithTestId);

        // Update Test with Question IDs
        newTest.questions = insertedQuestions.map((q) => q._id);
        await newTest.save();

        console.log(`Added ${insertedQuestions.length} questions to the test.`);

        console.log("Seeding complete!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
}

seed();
