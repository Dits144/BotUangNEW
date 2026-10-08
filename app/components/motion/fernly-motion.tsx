"use client";

import { Children, ReactNode, useEffect, useRef } from "react";
import { motion, usePresence, useReducedMotion } from "motion/react";
import { cn } from "@/app/lib/utils";

type RevealVariant = "card" | "task" | "content" | "compact";

const power3Out = (value: number) => 1 - Math.pow(1 - value, 3);
const power4Out = (value: number) => 1 - Math.pow(1 - value, 4);

const revealConfig = {
  card: { y: 36, scale: 0.985, duration: 0.85 },
  task: { y: 28, scale: 0.985, duration: 0.85 },
  content: { y: 12, scale: 1, duration: 0.55 },
  compact: { y: 10, scale: 1, duration: 0.55 },
} satisfies Record<RevealVariant, { y: number; scale: number; duration: number }>;

export function FadeUp({
  children,
  className,
  variant = "content",
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  as?: "div" | "section" | "header";
}) {
  const reduceMotion = useReducedMotion();
  const config = revealConfig[variant];

  const motionProps = {
    className,
    "data-fernly-exit": "",
    "data-fernly-reveal": variant,
    initial: { opacity: 0, y: config.y, scale: config.scale },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      duration: reduceMotion ? 0 : config.duration,
      delay: reduceMotion ? 0 : delay,
      ease: power3Out,
    },
  };

  if (as === "section") {
    return <motion.section {...motionProps}>{children}</motion.section>;
  }
  if (as === "header") {
    return <motion.header {...motionProps}>{children}</motion.header>;
  }
  return (
    <motion.div
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className,
  delay = 0.1,
  stagger = 0.07,
  variant = "card",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  variant?: RevealVariant;
}) {
  const reduceMotion = useReducedMotion();
  const config = revealConfig[variant];

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: reduceMotion ? 0 : delay,
            staggerChildren: reduceMotion ? 0 : stagger,
          },
        },
      }}
    >
      {Children.map(children, (child) => (
        <motion.div
          data-fernly-exit=""
          data-fernly-reveal={variant}
          variants={{
            hidden: { opacity: 0, y: config.y, scale: config.scale },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                duration: reduceMotion ? 0 : config.duration,
                ease: power3Out,
              },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export function RevealHeading({
  children,
  className,
  delay = 0,
}: {
  children: string;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  let characterIndex = 0;

  return (
    <h1 className={className} aria-label={children} data-fernly-exit="">
      {children.split(" ").map((word, wordIndex, words) => (
        <span
          key={`${word}-${wordIndex}`}
          className={cn("inline-flex overflow-hidden align-bottom", wordIndex < words.length - 1 && "mr-[0.28em]")}
          aria-hidden="true"
        >
          {[...word].map((character) => {
            const index = characterIndex;
            characterIndex += 1;
            return (
              <motion.span
                key={`${character}-${index}`}
                className="inline-block"
                data-fernly-character=""
                initial={{ y: "115%" }}
                animate={{ y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.85,
                  delay: reduceMotion ? 0 : delay + index * 0.024,
                  ease: power4Out,
                }}
              >
                {character}
              </motion.span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

export function RevealImage({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      data-fernly-exit=""
      data-fernly-reveal="image"
      initial={{ opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: reduceMotion ? 0 : 0.55,
        delay: reduceMotion ? 0 : delay,
        ease: power3Out,
      }}
    >
      {children}
    </motion.div>
  );
}

export function ShellEntrance({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      data-fernly-shell=""
      initial={{ opacity: 0, y: 18, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: reduceMotion ? 0 : 0.9,
        ease: power3Out,
      }}
    >
      {children}
    </motion.div>
  );
}

export function FernlyPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [isPresent, safeToRemove] = usePresence();

  useEffect(() => {
    if (isPresent) return;
    if (reduceMotion || !rootRef.current) {
      safeToRemove();
      return;
    }

    const candidates = Array.from(
      rootRef.current.querySelectorAll<HTMLElement>("[data-fernly-exit]"),
    );
    const targets = candidates.filter((element) => {
      const parentTarget = element.parentElement?.closest("[data-fernly-exit]");
      return !parentTarget || !rootRef.current?.contains(parentTarget);
    });
    const exitTargets = targets.length ? targets : [rootRef.current];
    const animations = exitTargets.map((element, index) =>
      element.animate(
        [
          { opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform },
          { opacity: 0, transform: "translateY(-10px)" },
        ],
        {
          duration: 220,
          delay: index * 15,
          easing: "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
          fill: "forwards",
        },
      ),
    );

    const exitDuration = 220 + Math.max(0, exitTargets.length - 1) * 15;
    const removalTimer = window.setTimeout(safeToRemove, exitDuration + 16);

    return () => {
      window.clearTimeout(removalTimer);
      animations.forEach((animation) => animation.cancel());
    };
  }, [isPresent, reduceMotion, safeToRemove]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
