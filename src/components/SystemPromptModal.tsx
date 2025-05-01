import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function SystemPromptModal({ show, onClose, value, setValue, chatUtils, setShowModal, chats, setChats, currentChatId, isChatPrompt }: any) {
	if (!show) return null;

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
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-md">
				<h2 className="font-bold text-lg mb-2">{isChatPrompt ? "Edit Chat System Prompt" : "Edit Overall System Prompt"}</h2>
				<Textarea
					className="w-full min-h-[80px] border rounded p-2 mb-4"
					value={localValue}
					onChange={(e) => setLocalValue(e.target.value)}
					placeholder={isChatPrompt ? "Enter chat-specific system prompt..." : "Enter overall system prompt..."}
				/>
				<div className="flex gap-2 justify-end">
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="default" onClick={handleSave}>
						Save
					</Button>
				</div>
			</div>
		</div>
	);
}
