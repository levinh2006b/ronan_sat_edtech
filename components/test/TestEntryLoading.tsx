"use client";

import { useEffect, useRef, useState } from "react";

type Quote = {
  author: string;
  text: string;
};

type TestEntryLoadingProps = {
  showQuote?: boolean;
};

const QUOTES: Quote[] = [
  { author: "Albert Einstein", text: "Stay curious." },
  { author: "Thomas Edison", text: "99% is hard work." },
  { author: "Elon Musk", text: "Work harder than others." },
  { author: "Bill Gates", text: "Learn from failure." },
  { author: "Kobe Bryant", text: "Outwork everyone." },
  { author: "Michael Jordan", text: "Never stop trying." },
  { author: "Will Smith", text: "Outwork the rest." },
  { author: "The Rock", text: "Consistency wins." },
  { author: "Jack Ma", text: "Don’t give up." },
  { author: "Andrew Tate", text: "Discipline first." },
  { author: "Naval Ravikant", text: "Build and learn." },
  { author: "Cal Newport", text: "Focus deeply." },
  { author: "James Clear", text: "Trust the system." },
  { author: "Tim Cook", text: "Hard work pays." },
  { author: "Arnold Schwarzenegger", text: "Keep climbing." },
  { author: "Gary Vaynerchuk", text: "Work relentlessly." },
  { author: "Mark Cuban", text: "Stay hungry." },
  { author: "Confucius", text: "Keep going." },
  { author: "Malcolm Gladwell", text: "Master takes time." },
  { author: "Steve Jobs", text: "Keep pushing." },
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
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [rippleOrigin, setRippleOrigin] = useState<{ x: number; y: number } | null>(null);

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

  useEffect(() => {
    const updateRippleOrigin = () => {
      if (!anchorRef.current) {
        return;
      }

      const rect = anchorRef.current.getBoundingClientRect();
      setRippleOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    };

    updateRippleOrigin();

    const resizeObserver = new ResizeObserver(() => {
      updateRippleOrigin();
    });

    if (anchorRef.current) {
      resizeObserver.observe(anchorRef.current);
    }

    window.addEventListener("resize", updateRippleOrigin);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateRippleOrigin);
    };
  }, []);

  const activeQuote = showQuote && quoteIndex !== null ? QUOTES[quoteIndex] : null;

  return (
    <div className="test-entry-loader relative flex min-h-screen items-center justify-center overflow-hidden bg-[#D0CECA] px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={
          {
            "--ripple-origin-x": rippleOrigin ? `${rippleOrigin.x}px` : "50%",
            "--ripple-origin-y": rippleOrigin ? `${rippleOrigin.y}px` : "50%",
          } as React.CSSProperties
        }
      >
        {rippleOrigin ? (
          <>
            <span className="loading-ripple loading-ripple-delay-0" />
            <span className="loading-ripple loading-ripple-delay-1" />
            <span className="loading-ripple loading-ripple-delay-2" />
          </>
        ) : null}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl translate-y-[4vh] justify-center sm:translate-y-[3vh]">
        <div ref={anchorRef} className="quote-ripple-anchor relative inline-flex w-full max-w-[44rem] justify-center">
          {showQuote ? (
            <div className={`relative z-10 w-full text-center ${isVisible ? "quote-fade-enter" : "quote-fade-exit"}`}>
              <blockquote className="quote-text mx-auto max-w-[40rem] text-balance text-[1.6rem] font-normal leading-[1.55] tracking-[-0.03em] text-[#222] sm:text-[2.15rem]">
                {activeQuote ? <>&ldquo;{activeQuote.text}&rdquo;</> : <span className="invisible">Loading quote</span>}
              </blockquote>
              <p className="mt-5 text-right text-[0.95rem] font-medium tracking-[0.02em] text-[#5f5b57] sm:text-[1.02rem]">
                {activeQuote ? activeQuote.author : <span className="invisible">Author</span>}
              </p>
            </div>
          ) : (
            <div className="h-[12rem] w-full sm:h-[14rem]" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
