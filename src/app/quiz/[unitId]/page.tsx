import { getUnits } from "@/utils/vocab";
import QuizLoader from "@/components/QuizLoader";

interface QuizPageProps {
  params: Promise<{
    unitId: string;
  }>;
}

export async function generateStaticParams() {
  const units = getUnits();
  return units.map((unit) => ({
    unitId: unit.id,
  }));
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { unitId } = await params;

  return <QuizLoader unitId={unitId} />;
}
