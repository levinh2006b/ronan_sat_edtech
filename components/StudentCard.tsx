import { CldImage } from "next-cloudinary";

interface StudentProps {
  name: string;
  school: string;
  score: number;
  examDate: string;
  imageUrl: string;
}

export default function StudentCard({ name, school, score, examDate, imageUrl }: StudentProps) {
  return (
    <article className="workbook-panel flex h-full flex-col overflow-hidden">
      <div className="relative h-60 w-full shrink-0 border-b-4 border-ink-fg bg-paper-bg">
        <CldImage
          src={imageUrl}
          alt={`Portrait of ${name}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
      </div>

      <div className="flex flex-1 flex-col bg-surface-white p-5 text-center">
        <div>
          <div className="workbook-sticker bg-accent-1">Hall of Fame</div>
          <h3 className="mt-4 font-display text-2xl font-black uppercase tracking-tight text-ink-fg">{name}</h3>
          <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-ink-fg">{school}</p>
        </div>

        <div className="mt-5 rounded-2xl border-2 border-ink-fg bg-primary px-4 py-4 text-ink-fg brutal-shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em]">SAT Score</p>
          <p className="mt-1 font-display text-4xl font-black tracking-tight">{score}</p>
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Exam Date: {examDate}</p>
      </div>
    </article>
  );
}
