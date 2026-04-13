import fs from "node:fs";
import { PDFParse } from "pdf-parse";

async function main() {
    const dataBuffer = fs.readFileSync("./question_bank/reading_question.pdf");
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();

    fs.writeFileSync("./reading_sample.txt", data.text.substring(0, 3000));
    await parser.destroy();
    console.log("Written to reading_sample.txt");
}

main().catch(console.error);
