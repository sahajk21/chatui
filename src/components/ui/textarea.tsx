import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const resize = () => {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 320) + "px";
      };
      resize();
      textarea.addEventListener("input", resize);
      return () => textarea.removeEventListener("input", resize);
    }, []);

    return (
      <textarea
        data-slot="textarea"
        ref={node => {
          textareaRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }}
        className={cn(
          "bg-muted/60 dark:bg-muted/40 px-4 py-3 text-base transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        style={{ maxHeight: 320, overflowY: "auto" }}
        {...props}
      />
    )
  }
);

Textarea.displayName = "Textarea";

export { Textarea }
