import { redirect } from "next/navigation";

import { TestManagerQuestionEditor } from "@/components/test-manager/TestManagerQuestionEditor";
import { getServerSession } from "@/lib/auth/server";

type PageProps = {
  params: Promise<{
    cardId: string;
  }>;
};

export default async function TestManagerQuestionPage({ params }: PageProps) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/auth");
  }

  if (!session.user.permissions.includes("edit_public_exams")) {
    redirect("/dashboard");
  }

  const { cardId } = await params;
  return <TestManagerQuestionEditor cardId={cardId} />;
}
