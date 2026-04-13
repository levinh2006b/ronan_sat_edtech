"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import BrandLogo from "@/components/BrandLogo";

type Quote = {
  author: string;
  text: string;
};

type TestEntryLoadingProps = {
  showQuote?: boolean;
};

const QUOTES: Quote[] = [
  { author: "Albert Einstein", text: "Life is like riding a bicycle." },
  { author: "Thomas Edison", text: "There is no substitute for hard work." },
  { author: "Confucius", text: "It does not matter how slowly you go." },
  { author: "Lao Tzu", text: "The journey of a thousand miles begins with one step." },
  { author: "Aristotle", text: "We are what we repeatedly do." },
  { author: "Maya Angelou", text: "Nothing will work unless you do." },
  { author: "Helen Keller", text: "Keep your face to the sunshine." },
  { author: "Eleanor Roosevelt", text: "You must do the thing you think you cannot do." },
  { author: "Winston Churchill", text: "Never, never, never give up." },
  { author: "Theodore Roosevelt", text: "Believe you can and you're halfway there." },
  { author: "Henry Ford", text: "Whether you think you can, or you think you can't, you're right." },
  { author: "Steve Jobs", text: "Stay hungry. Stay foolish." },
  { author: "Nelson Mandela", text: "It always seems impossible until it's done." },
  { author: "Vince Lombardi", text: "The price of success is hard work." },
  { author: "Babe Ruth", text: "Never let the fear of striking out keep you from playing the game." },
  { author: "Wayne Gretzky", text: "You miss 100% of the shots you don't take." },
  { author: "Michael Jordan", text: "I've failed over and over again in my life." },
  { author: "Amelia Earhart", text: "The most difficult thing is the decision to act." },
  { author: "Ralph Waldo Emerson", text: "Do the thing and you will have the power." },
  { author: "Walt Disney", text: "The way to get started is to quit talking and begin doing." },
  { author: "Bruce Lee", text: "Knowing is not enough, we must apply." },
  { author: "Benjamin Franklin", text: "Energy and persistence conquer all things." },
  { author: "Plutarch", text: "What we achieve inwardly will change outer reality." },
  { author: "Booker T. Washington", text: "Success is to be measured not so much by the position that one has reached in life as by the obstacles which he has overcome." },
];

const QUOTE_CHANGE_INTERVAL_MS = 3200;
const QUOTE_FADE_DURATION_MS = 420;

function getRandomQuoteIndex(excludeIndex?: number) {
  if (QUOTES.length <= 1) {
    return 0;
  }

  let nextIndex = Math.floor(Math.random() * QUOTES.length);

  while (nextIndex === excludeIndex) {
    nextIndex = Math.floor(Math.random() * QUOTES.length);
  }

  return nextIndex;
}

export default function TestEntryLoading({ showQuote = true }: TestEntryLoadingProps) {
  const [quoteIndex, setQuoteIndex] = useState<number | null>(showQuote ? null : 0);
  const [isVisible, setIsVisible] = useState(!showQuote);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.classList.add("loading-screen-active");

    return () => {
      document.body.classList.remove("loading-screen-active");
    };
  }, []);

  useEffect(() => {
    if (!showQuote) {
      return;
    }

    const initializeQuoteTimeoutId = window.setTimeout(() => {
      setQuoteIndex(getRandomQuoteIndex());
      setIsVisible(true);
    }, 0);

    return () => {
      window.clearTimeout(initializeQuoteTimeoutId);
    };
  }, [showQuote]);

  useEffect(() => {
    if (!showQuote || quoteIndex === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setIsVisible(false);

      timeoutRef.current = window.setTimeout(() => {
        setQuoteIndex((currentIndex) => getRandomQuoteIndex(currentIndex ?? undefined));
        setIsVisible(true);
      }, QUOTE_FADE_DURATION_MS);
    }, QUOTE_CHANGE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [quoteIndex, showQuote]);

  const activeQuote = showQuote && quoteIndex !== null ? QUOTES[quoteIndex] : null;

  return (
    <div className="test-entry-loader bg-dot-pattern fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-paper-bg px-6 py-12">
      <section className="workbook-panel w-full max-w-xl overflow-hidden bg-paper-bg">
        <div className="px-6 py-6 text-center md:px-8 md:py-8">
          <div className="flex justify-center">
            <BrandLogo
              className="justify-center"
              iconClassName="rounded-2xl border-2 border-ink-fg bg-surface-white p-2 brutal-shadow-sm"
              labelClassName="text-xl"
              size={44}
              priority
            />
          </div>

          <div className="mt-6 flex justify-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-ink-fg bg-primary brutal-shadow-sm">
              <LoaderCircle className="h-8 w-8 animate-spin text-ink-fg" />
            </div>
          </div>

          <div className="mt-6">
            <h1 className="font-display text-3xl font-black uppercase tracking-tight text-ink-fg md:text-[2.2rem]">
              Preparing your session
            </h1>
          </div>

          {showQuote ? (
            <div className="mt-6 border-t-4 border-ink-fg pt-6">
              <div className={`${isVisible ? "quote-fade-enter" : "quote-fade-exit"}`}>
                <blockquote className="quote-text mx-auto max-w-[24rem] text-balance text-[1.3rem] leading-[1.25] text-ink-fg md:text-[1.55rem]">
                  {activeQuote ? <>&ldquo;{activeQuote.text}&rdquo;</> : <span className="invisible">Loading quote</span>}
                </blockquote>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/65">
                  {activeQuote ? activeQuote.author : <span className="invisible">Author</span>}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
