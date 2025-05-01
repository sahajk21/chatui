import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";

export default function ChatDropdown({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
	const [open, setOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
		} else {
			document.removeEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [open]);

	return (
		<div ref={dropdownRef} className="relative">
			<Button size="icon" variant="ghost" aria-label="Chat options" onClick={() => setOpen((v) => !v)} className="ml-1" tabIndex={0}>
				<MoreVertical className="size-4" />
			</Button>
			{open && (
				<div className="absolute right-0 top-8 z-30 min-w-[120px] bg-popover border rounded shadow-md py-1">
					<button
						className="w-full text-left px-4 py-2 hover:bg-accent text-sm cursor-pointer"
						onClick={() => {
							setOpen(false);
							onRename();
						}}
					>
						Rename
					</button>
					<button
						className="w-full text-left px-4 py-2 hover:bg-accent text-sm text-destructive cursor-pointer"
						onClick={() => {
							setOpen(false);
							onDelete();
						}}
					>
						Delete
					</button>
				</div>
			)}
		</div>
	);
}
