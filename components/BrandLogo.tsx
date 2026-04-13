import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  withWordmark?: boolean;
  size?: number;
  priority?: boolean;
};

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function BrandLogo({
  className,
  iconClassName,
  labelClassName,
  withWordmark = true,
  size = 32,
  priority = false,
}: BrandLogoProps) {
  return (
    <div className={joinClasses("flex items-center gap-3", className)}>
      <div
        className={joinClasses("shrink-0", iconClassName)}
        style={{ width: size, height: size }}
      >
        <Image
          src="/brand/logo.svg"
          alt="Ronan SAT logo"
          width={size}
          height={size}
          priority={priority}
          className="h-full w-full object-contain"
        />
      </div>
      {withWordmark ? (
        <span
          className={joinClasses(
            "font-display font-bold uppercase tracking-tight text-ink-fg",
            labelClassName,
          )}
        >
          Ronan SAT
        </span>
      ) : null}
    </div>
  );
}
