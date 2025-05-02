import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function SystemPromptModal({ show, onClose, value, setValue, chatUtils, setShowModal, chats, setChats, currentChatId, isChatPrompt }: any) {
	const [localValue, setLocalValue] = useState(value);

	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	function handleSave() {
		if (isChatPrompt && chats && setChats && currentChatId) {
			const idx = chats.findIndex((c: any) => c.id === currentChatId);
			if (idx === -1) return;
			const updated = [...chats];
			updated[idx] = { ...updated[idx], systemPrompt: localValue };
			setChats(updated);
			chatUtils.saveChats(updated);
			setShowModal(false);
		} else if (chatUtils && setValue) {
			chatUtils.setOverallSystemPrompt(localValue);
			setValue(localValue);
			setShowModal(false);
		}
	}

	return (
		<Dialog open={show} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isChatPrompt ? "Edit Chat System Prompt" : "Edit Overall System Prompt"}</DialogTitle>
				</DialogHeader>
				<Textarea
					className="w-full min-h-[80px] mb-4"
					value={localValue}
					onChange={(e) => setLocalValue(e.target.value)}
					placeholder={isChatPrompt ? "Enter chat-specific system prompt..." : "Enter overall system prompt..."}
				/>
				<DialogFooter>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="default" onClick={handleSave}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
