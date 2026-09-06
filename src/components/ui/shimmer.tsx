"use client";

import { cn } from "cn";
import { motion } from "motion/react";
import { type CSSProperties, memo, useMemo } from "react";

export interface TextShimmerProps {
  children: string;
  className?: string;
  duration?: number;
  spread?: number;
}

/** CSS custom properties aren't in `CSSProperties`; widen by annotation, not a cast. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string>;

const ShimmerComponent = ({ children, className, duration = 2, spread = 2 }: TextShimmerProps) => {
  const dynamicSpread = useMemo(() => (children?.length ?? 0) * spread, [children, spread]);

  const style: StyleWithVars = {
    "--spread": `${dynamicSpread}px`,
    backgroundImage:
      "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
  };

  return (
    <motion.p
      animate={{ backgroundPosition: "0% center" }}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={style}
      transition={{
        repeat: Number.POSITIVE_INFINITY,
        duration,
        ease: "linear",
      }}
    >
      {children}
    </motion.p>
  );
};

export const Shimmer = memo(ShimmerComponent);
