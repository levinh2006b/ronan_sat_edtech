import { resultController } from "@/lib/controllers/resultController";

export async function PATCH(req: Request) {
  return resultController.updateAnswerReason(req);
}
