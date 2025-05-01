import { useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, UploadIcon, Square } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const ChatInput = ({ currentChat, chats, setChats, currentChatId, model, setModel, overallSystemPrompt, chatUtils }: any) => {
	const lastPasteElRef = useRef<HTMLTextAreaElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const [input, setInput] = useState("");
	const [files, setFiles] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [streaming, setStreaming] = useState(false);
	const abortControllerRef = useRef<AbortController | null>(null);

	const handleFormSend = useCallback(
		async () => {
			if (!currentChatId) return;

			let chatIdx = chats.findIndex((c: any) => c.id === currentChatId);
			if (chatIdx === -1) return;

			let updatedChats = [...chats];
			let updatedMessages = [...updatedChats[chatIdx].messages];

			const lastUserIdx = updatedMessages.length - 1;
			updatedMessages = updatedMessages.slice(0, lastUserIdx + 1);
			const newMessage = {
				id: uuidv4(),
				role: "user",
				content: input,
				files,
			};
			updatedMessages.push(newMessage);
			updatedChats[chatIdx].messages = updatedMessages;
			setChats(updatedChats);
			chatUtils.saveChats(updatedChats);
			setInput("");
			setFiles([]);

			setLoading(true);
			setStreaming(true);

			chatIdx = updatedChats.findIndex((c: any) => c.id === currentChatId);
			if (chatIdx === -1) return;
			let messagesToSend = [...updatedChats[chatIdx].messages];

			if (messagesToSend.length > 0 && messagesToSend[messagesToSend.length - 1].role === "user") {
				messagesToSend[messagesToSend.length - 1] = {
					...messagesToSend[messagesToSend.length - 1],
					files: files,
				};
			}

			let combinedSystemPrompt = "";
			if (overallSystemPrompt && currentChat?.systemPrompt) {
				combinedSystemPrompt = overallSystemPrompt.trim() + "\n" + currentChat.systemPrompt.trim();
			} else if (overallSystemPrompt) {
				combinedSystemPrompt = overallSystemPrompt.trim();
			} else if (currentChat?.systemPrompt) {
				combinedSystemPrompt = currentChat.systemPrompt.trim();
			}
			if (combinedSystemPrompt) {
				if (!(messagesToSend.length > 0 && messagesToSend[0].role === "system")) {
					messagesToSend = [
						{
							id: "system-prompt",
							role: "system",
							content: combinedSystemPrompt,
						},
						...messagesToSend,
					];
				}
			}

			let res: Response;

			if (files.length > 0) {
				const formData = new FormData();
				formData.append("messages", JSON.stringify(messagesToSend));
				formData.append("model", updatedChats[chatIdx].model || model);
				await Promise.all(
					files.map((file: any, idx: number) =>
						fetch(file.url)
							.then((r) => r.blob())
							.then((blob) => {
								const fileObj = new File([blob], file.name, { type: file.type });
								formData.set(`file_${file.name}_${idx}`, fileObj);
							})
					)
				);
				res = await fetch("/api/azure-openai", {
					method: "POST",
					body: formData,
					signal: abortControllerRef.current?.signal,
				});
			} else {
				res = await fetch("/api/azure-openai", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						messages: messagesToSend,
						model: updatedChats[chatIdx].model || model,
					}),
					signal: abortControllerRef.current?.signal,
				});
			}

			if (!res.ok || !res.body) {
				setLoading(false);
				setStreaming(false);
				return;
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let done = false;
			let responseMsg = {
				id: uuidv4(),
				role: "assistant",
				content: "",
				files: [],
			};

			while (!done) {
				const { value, done: doneReading } = await reader.read();
				done = doneReading;
				if (value) {
					const chunk = decoder.decode(value);
					responseMsg.content += chunk;
					const updated = [...chats];
					const idx = updated.findIndex((c: any) => c.id === currentChatId);
					if (idx !== -1) {
						const chat = { ...updated[idx] };
						const msgs = [...chat.messages];
						if (msgs[msgs.length - 1]?.role === "assistant") {
							msgs[msgs.length - 1].content = responseMsg.content;
						} else {
							msgs.push({ ...responseMsg });
						}
						chat.messages = msgs;
						updated[idx] = chat;
						setChats(updated);
					}
				}
			}

			setStreaming(false);
			setLoading(false);

			const finalChats = [...chats];
			const idx = finalChats.findIndex((c: any) => c.id === currentChatId);
			if (idx !== -1) {
				const chat = { ...finalChats[idx] };
				const msgs = [...chat.messages];
				if (msgs[msgs.length - 1]?.role === "assistant") {
					msgs[msgs.length - 1].content = responseMsg.content;
				} else {
					msgs.push({ ...responseMsg });
				}
				chat.messages = msgs;
				finalChats[idx] = chat;
				setChats(finalChats);
				chatUtils.saveChats(finalChats);
			}
		},
		[
			chats,
			currentChatId,
			files,
			setChats,
			chatUtils,
			textareaRef,
			model,
			setLoading,
			setStreaming,
			abortControllerRef,
			currentChat,
			overallSystemPrompt,
			input,
			setInput,
		]
	);

	const handleFileChangeAppend = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const filesArr = Array.from(e.target.files || []);
			const previews = filesArr.map((file) => ({
				name: file.name,
				url: URL.createObjectURL(file),
				type: file.type,
			}));
			setFiles((prev: any[]) => [...prev, ...previews]);
		},
		[setFiles]
	);

	const handlePaste = useCallback(
		(e: ClipboardEvent) => {
			if (!e.clipboardData) return;
			const items = Array.from(e.clipboardData.items);
			const imageItems = items.filter((item) => item.type.startsWith("image/"));
			if (imageItems.length === 0) return;
			e.preventDefault();
			const newFiles: any[] = [];
			imageItems.forEach((item) => {
				const file = item.getAsFile();
				if (file) {
					const url = URL.createObjectURL(file);
					newFiles.push({
						name: file.name || "pasted-image.png",
						url,
						type: file.type,
					});
				}
			});
			setFiles((prev: any[]) => [...prev, ...newFiles]);
		},
		[setFiles]
	);

	const textareaCallbackRef = useCallback(
		(el: HTMLTextAreaElement | null) => {
			if (lastPasteElRef.current) {
				lastPasteElRef.current.removeEventListener("paste", handlePaste as any);
			}
			if (textareaRef) {
				textareaRef.current = el;
			}
			if (el) {
				el.addEventListener("paste", handlePaste as any);
			}
			lastPasteElRef.current = el;
		},
		[textareaRef, handlePaste]
	);

	function handleRemoveFile(idx: number) {
		setFiles((prev: any[]) => prev.filter((_: any, i: number) => i !== idx));
	}

	function handleStopStreaming() {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			setStreaming(false);
		}
	}

	return (
		<div className="w-full bg-background/95">
			<form
				className="shrink-0 flex flex-col gap-2 p-4 border rounded-2xl mx-4 mb-4 bg-background/80"
				onSubmit={(e) => {
					e.preventDefault();
					if (!streaming) handleFormSend();
				}}
			>
				<div className="flex gap-2 items-end">
					<Textarea
						ref={textareaCallbackRef}
						className="flex-1 min-h-[48px] max-h-40 border-none bg-transparent px-0 py-0 focus-visible:ring-0 focus-visible:border-none outline-none"
						placeholder="Type your message..."
						value={input}
						disabled={loading || !currentChatId}
						rows={2}
						onChange={(e) => {
							setInput(e.target.value);
							const el = textareaRef?.current;
							if (el) {
								el.style.height = "auto";
								el.style.height = el.scrollHeight + "px";
							}
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleFormSend();
							}
						}}
					/>
				</div>
				{files.length > 0 && (
					<div className="flex gap-2 flex-wrap">
						{files.map((file: any, idx: number) => (
							<div key={idx} className="relative inline-block">
								<button
									type="button"
									onClick={() => handleRemoveFile(idx)}
									className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10 hover:bg-red-600"
									aria-label="Remove file"
									tabIndex={0}
									style={{ lineHeight: 1 }}
								>
									×
								</button>
								{file.type.startsWith("image/") ? <img src={file.url} alt={file.name} className="w-12 h-12 object-cover rounded" /> : <span className="text-xs">{file.name}</span>}
							</div>
						))}
					</div>
				)}
				<div className="flex gap-2 items-center justify-end mt-2">
					<label htmlFor="file-upload" className="cursor-pointer">
						<Button type="button" variant="ghost" size="icon" asChild disabled={loading || !currentChatId} aria-label="Upload files" title="Upload files">
							<span>
								<UploadIcon className="size-5" />
							</span>
						</Button>
						<input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChangeAppend} disabled={loading || !currentChatId} />
					</label>
					{streaming ? (
						<Button type="button" variant="destructive" size="icon" aria-label="Stop streaming" title="Stop streaming" className="cursor-pointer" onClick={handleStopStreaming}>
							<Square className="size-5" />
						</Button>
					) : (
						<Button
							type="submit"
							variant="ghost"
							size="icon"
							disabled={loading || !currentChatId || (!input.trim() && files.length === 0)}
							aria-label="Send message"
							title="Send"
							className="cursor-pointer"
						>
							<ArrowUp className="size-5" />
						</Button>
					)}
				</div>
			</form>
		</div>
	);
};

export default ChatInput;
