import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full bg-aloa-white border-2 border-aloa-black px-4 py-3 text-base transition-all duration-200",
        "placeholder:text-aloa-gray",
        "focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-aloa-cream",
        "hover:shadow-md",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }