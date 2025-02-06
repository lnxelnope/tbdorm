import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

const Card = ({ className, asChild = false, ...props }: CardProps) => {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.02] before:to-transparent",
        "animate-in fade-in-50 duration-500 ease-out",
        className
      )}
      {...props}
    />
  );
};

const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-4", className)}
      {...props}
    />
  );
};

const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-white/90",
        className
      )}
      {...props}
    />
  );
};

const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => {
  return (
    <p
      className={cn("text-sm text-white/60", className)}
      {...props}
    />
  );
};

const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn("relative z-20", className)} {...props} />
  );
};

const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("flex items-center pt-4", className)}
      {...props}
    />
  );
};

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }; 