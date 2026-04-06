import TestEntryLoading from "@/components/test/TestEntryLoading";

type LoadingProps = {
  showQuote?: boolean;
};

export default function Loading({ showQuote = true }: LoadingProps) {
  return <TestEntryLoading showQuote={showQuote} />;
}
