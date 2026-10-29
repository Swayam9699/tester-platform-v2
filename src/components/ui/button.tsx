import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[transform,background,box-shadow,opacity,color] duration-150 outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/60 active:not-disabled:not-aria-[haspopup]:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-linear-to-b from-[#2b2e35] to-[#0c0d10] text-primary-foreground shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] hover:not-disabled:from-[#363a42] hover:not-disabled:to-[#15171b]",
        outline: "border-border bg-white text-ink-2 hover:not-disabled:bg-[#fafafa] hover:not-disabled:text-foreground aria-expanded:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:not-disabled:bg-black/[0.07]",
        ghost: "text-ink-2 hover:not-disabled:bg-black/5 aria-expanded:bg-black/5",
        destructive: "bg-bad-soft text-destructive hover:not-disabled:bg-destructive/15 focus-visible:ring-destructive/20",
        link: "h-auto! rounded-none px-0! text-ink-2 underline-offset-4 hover:text-foreground hover:underline",
      },
      size: {
        default: "h-10 px-[1.1rem]",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-[0.8rem] text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 px-6",
        icon: "size-10",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
