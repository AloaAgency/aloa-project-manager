import * as React from "react"
import { cn } from "@/lib/utils"

const buttonVariants = {
  variant: {
    default: "bg-aloa-black text-aloa-cream hover:bg-opacity-90 shadow-lg hover:shadow-xl transition-all duration-300 uppercase tracking-wider font-medium",
    destructive: "bg-red-600 text-white hover:bg-red-700 transition-all duration-300",
    outline: "border-2 border-aloa-black bg-transparent text-aloa-black hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 uppercase tracking-wider font-medium",
    secondary: "bg-aloa-sand text-aloa-black hover:bg-aloa-gray hover:text-aloa-cream transition-all duration-300",
    ghost: "hover:bg-aloa-sand transition-all duration-300",
    link: "text-aloa-black underline-offset-4 hover:underline",
  },
  size: {
    default: "h-12 px-6 py-3",
    sm: "h-10 px-4 py-2 text-sm",
    lg: "h-14 px-8 py-4 text-lg",
    icon: "h-12 w-12",
  },
}

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aloa-black focus-visible:ring-offset-2 focus-visible:ring-offset-aloa-cream disabled:opacity-50 disabled:pointer-events-none transform hover:-translate-y-0.5",
        buttonVariants.variant[variant],
        buttonVariants.size[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }