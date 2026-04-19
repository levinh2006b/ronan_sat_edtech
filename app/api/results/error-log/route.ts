import { resultController } from "@/lib/controllers/resultController";

export async function GET(req: Request) {
  return resultController.getUserErrorLog(req);
}
