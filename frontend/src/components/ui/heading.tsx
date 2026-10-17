import React from "react";
import { cn } from "@/lib/utils";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function Heading({ level = 1, className, ...props }: HeadingProps) {
  const Component = `h${level}` as any;
  
  return (
    <Component 
      className={cn(
        "font-sora font-bold tracking-tight text-foreground",
        level === 1 && "text-3xl md:text-4xl",
        level === 2 && "text-2xl md:text-3xl",
        level === 3 && "text-xl md:text-2xl",
        level === 4 && "text-lg md:text-xl",
        level === 5 && "text-base md:text-lg",
        level === 6 && "text-sm md:text-base",
        className
      )} 
      {...props} 
    />
  );
}
