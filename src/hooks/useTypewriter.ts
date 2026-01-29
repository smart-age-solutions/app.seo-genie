"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseTypewriterOptions {
  speed?: number; // characters per update (higher = faster)
  onComplete?: () => void;
}

export function useTypewriter(text: string, options: UseTypewriterOptions = {}) {
  const { speed = 3, onComplete } = options;
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const rafRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const textRef = useRef(text);
  const onCompleteRef = useRef(onComplete);
  const frameCountRef = useRef(0);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const cancelAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    cancelAnimation();

    if (textRef.current !== text) {
      textRef.current = text;
      setDisplayedText("");
      indexRef.current = 0;
      frameCountRef.current = 0;
      setIsTyping(!!text);
    }

    if (!text) {
      setDisplayedText("");
      setIsTyping(false);
      return;
    }

    if (indexRef.current < text.length) {
      setIsTyping(true);

      const typeNextBatch = () => {
        frameCountRef.current++;
        
        // Update every 2 frames (~30fps) to reduce re-renders
        if (frameCountRef.current % 2 === 0 && indexRef.current < text.length) {
          const charsToAdd = Math.min(speed, text.length - indexRef.current);
          indexRef.current += charsToAdd;
          setDisplayedText(text.slice(0, indexRef.current));

          if (indexRef.current >= text.length) {
            setIsTyping(false);
            onCompleteRef.current?.();
            return;
          }
        }
        
        if (indexRef.current < text.length) {
          rafRef.current = requestAnimationFrame(typeNextBatch);
        }
      };

      rafRef.current = requestAnimationFrame(typeNextBatch);
    }

    return cancelAnimation;
  }, [text, speed, cancelAnimation]);

  return { displayedText, isTyping };
}

// Hook for HTML content with typewriter effect
export function useTypewriterHTML(html: string, options: UseTypewriterOptions = {}) {
  const { speed = 15, onComplete } = options;
  const [displayedHTML, setDisplayedHTML] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const rafRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const htmlRef = useRef(html);
  const textLengthRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const frameCountRef = useRef(0);
  const lastHTMLRef = useRef("");

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const cancelAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Calculate safe cut point for HTML - avoid cutting inside tags
  const getSafeCutIndex = useCallback((htmlStr: string, targetLength: number): number => {
    if (targetLength >= htmlStr.length) return htmlStr.length;
    
    let cutIndex = targetLength;
    const slice = htmlStr.slice(0, targetLength);
    const lastOpenTag = slice.lastIndexOf("<");
    const lastCloseTag = slice.lastIndexOf(">");
    
    if (lastOpenTag > lastCloseTag) {
      const closeIndex = htmlStr.indexOf(">", targetLength);
      if (closeIndex !== -1) {
        cutIndex = closeIndex + 1;
      }
    }
    
    return cutIndex;
  }, []);

  useEffect(() => {
    cancelAnimation();

    if (!html) {
      setDisplayedHTML("");
      setIsTyping(false);
      lastHTMLRef.current = "";
      return;
    }

    // Reset when HTML changes
    if (htmlRef.current !== html) {
      htmlRef.current = html;
      const textOnly = html.replace(/<[^>]*>/g, "");
      textLengthRef.current = textOnly.length;
      setDisplayedHTML("");
      indexRef.current = 0;
      frameCountRef.current = 0;
      lastHTMLRef.current = "";
      setIsTyping(true);
    }

    if (indexRef.current < textLengthRef.current) {
      setIsTyping(true);

      const typeNextBatch = () => {
        frameCountRef.current++;
        
        // Update every 3 frames (~20fps) to significantly reduce re-renders and flickering
        if (frameCountRef.current % 3 === 0 && indexRef.current < textLengthRef.current) {
          const charsToAdd = Math.min(speed, textLengthRef.current - indexRef.current);
          indexRef.current += charsToAdd;

          const progress = indexRef.current / textLengthRef.current;
          const targetLength = Math.floor(html.length * progress);
          const cutIndex = getSafeCutIndex(html, targetLength);
          const newHTML = html.slice(0, cutIndex);
          
          // Only update if HTML actually changed (prevents unnecessary re-renders)
          if (newHTML !== lastHTMLRef.current) {
            lastHTMLRef.current = newHTML;
            setDisplayedHTML(newHTML);
          }

          if (indexRef.current >= textLengthRef.current) {
            setDisplayedHTML(html);
            lastHTMLRef.current = html;
            setIsTyping(false);
            onCompleteRef.current?.();
            return;
          }
        }
        
        if (indexRef.current < textLengthRef.current) {
          rafRef.current = requestAnimationFrame(typeNextBatch);
        }
      };

      rafRef.current = requestAnimationFrame(typeNextBatch);
    }

    return cancelAnimation;
  }, [html, speed, cancelAnimation, getSafeCutIndex]);

  return { displayedHTML, isTyping };
}
