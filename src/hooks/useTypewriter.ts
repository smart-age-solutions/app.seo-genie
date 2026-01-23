"use client";

import { useState, useEffect, useRef } from "react";

interface UseTypewriterOptions {
  speed?: number; // milliseconds per character
  onComplete?: () => void;
}

export function useTypewriter(text: string, options: UseTypewriterOptions = {}) {
  const { speed = 8, onComplete } = options;
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);
  const textRef = useRef(text);
  const onCompleteRef = useRef(onComplete);

  // Update onComplete ref when it changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset when text changes
    if (textRef.current !== text) {
      textRef.current = text;
      setDisplayedText("");
      indexRef.current = 0;
      setIsTyping(!!text); // Set typing to true if text exists
    }

    if (!text) {
      setDisplayedText("");
      setIsTyping(false);
      return;
    }

    // Start typing if we have text and haven't finished
    if (indexRef.current < text.length) {
      setIsTyping(true);
      
      const typeNextChar = () => {
        if (indexRef.current < text.length) {
          setDisplayedText(text.slice(0, indexRef.current + 1));
          indexRef.current += 1;

          if (indexRef.current >= text.length) {
            setIsTyping(false);
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
          } else {
            timeoutRef.current = setTimeout(typeNextChar, speed);
          }
        }
      };

      // Start typing immediately
      timeoutRef.current = setTimeout(typeNextChar, speed);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [text, speed]);

  return { displayedText, isTyping };
}

// Hook for HTML content with typewriter effect
export function useTypewriterHTML(html: string, options: UseTypewriterOptions = {}) {
  const { speed = 2, onComplete } = options;
  const [displayedHTML, setDisplayedHTML] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);
  const htmlRef = useRef(html);
  const textLengthRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  // Update onComplete ref when it changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!html) {
      setDisplayedHTML("");
      setIsTyping(false);
      return;
    }

    // Reset when HTML changes
    if (htmlRef.current !== html) {
      htmlRef.current = html;
      // Calculate text length (without HTML tags) for progress
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      textLengthRef.current = tempDiv.textContent?.length || 0;
      setDisplayedHTML("");
      indexRef.current = 0;
      setIsTyping(true);
    }

    // Start typing if we have HTML and haven't finished
    if (indexRef.current < textLengthRef.current) {
      const typeNext = () => {
        if (indexRef.current < textLengthRef.current) {
          // Calculate how much HTML to show based on text progress
          const progress = (indexRef.current + 1) / textLengthRef.current;
          const targetLength = Math.floor(html.length * progress);
          setDisplayedHTML(html.slice(0, targetLength));
          
          indexRef.current += 1;

          if (indexRef.current >= textLengthRef.current) {
            // Ensure full HTML is displayed at the end
            setDisplayedHTML(html);
            setIsTyping(false);
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
          } else {
            timeoutRef.current = setTimeout(typeNext, speed);
          }
        }
      };

      // Start typing immediately
      timeoutRef.current = setTimeout(typeNext, speed);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [html, speed]);

  return { displayedHTML, isTyping };
}
