import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProseMarkdown from "@/components/ProseMarkdown";
import { memo, useState, useRef } from "react";
import { Trash2, FileText, Plus, RotateCcw } from "lucide-react";
import SystemPromptModal from "@/components/SystemPromptModal";
import ChatInput from "@/components/ChatInput";
import type { Chat, Message } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import React from "react";

const MODEL_OPTIONS = [
	{ value: "gpt-4o", label: "GPT-4o" },
	{ value: "o4-mini", label: "O4-Mini" },
];

const ChatArea = memo(function ChatArea({
	currentChat,
	chats,
	setChats,
	currentChatId,
	overallSystemPrompt,
	scrollRef,
	chatUtils,
}: {
	currentChat: Chat | undefined;
	chats: Chat[];
	setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
	currentChatId: string | null;
	overallSystemPrompt: string;
	scrollRef: React.RefObject<HTMLDivElement | null> | null;
	chatUtils: any;
}) {
	const [model, setModel] = useState(MODEL_OPTIONS[0].value);
	const [showChatPromptModal, setShowChatPromptModal] = useState(false);
	const [chatPromptDraft, setChatPromptDraft] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const abortControllerRef = useRef<AbortController | null>(null);

	function truncateWithEllipsis(text: string, maxLength: number) {
		return text && text.length > maxLength ? text.slice(0, maxLength) + "..." : text || "";
	}

	function handleEditChatPrompt() {
		setChatPromptDraft(currentChat?.systemPrompt || "");
		setShowChatPromptModal(true);
	}

	function handleModelChange(value: string) {
		setModel(value);
		if (currentChatId) {
			const idx = chats.findIndex((c) => c.id === currentChatId);
			if (idx !== -1) {
				const updated = [...chats];
				updated[idx].model = value;
				setChats(updated);
				chatUtils.saveChats(updated);
			}
		}
	}

	function handleDeleteMessage(idx: number) {
		if (!currentChatId) return;
		const chatIdx = chats.findIndex((c) => c.id === currentChatId);
		if (chatIdx === -1) return;

		const chat = chats[chatIdx];
		const msgs = [...chat.messages];
		msgs.splice(idx, 1);
		if (msgs[idx] && msgs[idx].role === "assistant") {
			msgs.splice(idx, 1);
		}
		const updatedChats = [...chats];
		updatedChats[chatIdx] = { ...chat, messages: msgs };
		setChats(updatedChats);
		chatUtils.saveChats(updatedChats);
	}

	async function handleRegenerateMessage(idx: number) {
		if (!currentChatId || loading) return;
		const chatIdx = chats.findIndex((c) => c.id === currentChatId);
		if (chatIdx === -1) return;

		const chat = chats[chatIdx];
		// Remove the AI message at idx and any subsequent messages
		const messagesUpToPoint = chat.messages.slice(0, idx);
		
		// Set up abort controller
		abortControllerRef.current = new AbortController();
		setLoading(true);

		let messagesToSend = [...messagesUpToPoint];

		// Add system prompts like in ChatInput
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
						role: "system" as const,
						content: combinedSystemPrompt,
					},
					...messagesToSend,
				];
			}
		}

		try {
			// Update chat with truncated messages before making API call
			const updatedChats = [...chats];
			updatedChats[chatIdx] = { ...chat, messages: messagesUpToPoint };
			setChats(updatedChats);
			chatUtils.saveChats(updatedChats);

			// Make API call
			const res = await fetch("/api/azure-openai", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: messagesToSend,
					model: chat.model || model,
				}),
				signal: abortControllerRef.current?.signal,
			});

			if (!res.ok || !res.body) {
				setLoading(false);
				return;
			}

			// Handle streaming response
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let done = false;
			const responseMsg: Message = {
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
					// Update with current chats state, not the original one
					setChats(currentChats => {
						const updated = [...currentChats];
						const currentIdx = updated.findIndex((c) => c.id === currentChatId);
						if (currentIdx !== -1) {
							const currentChatData = { ...updated[currentIdx] };
							const msgs = [...currentChatData.messages];
							if (msgs[msgs.length - 1]?.role === "assistant") {
								msgs[msgs.length - 1].content = responseMsg.content;
							} else {
								msgs.push({ ...responseMsg });
							}
							currentChatData.messages = msgs;
							updated[currentIdx] = currentChatData;
						}
						return updated;
					});
				}
			}

			// Save final result
			setChats(currentChats => {
				const finalChats = [...currentChats];
				const finalIdx = finalChats.findIndex((c) => c.id === currentChatId);
				if (finalIdx !== -1) {
					const finalChat = { ...finalChats[finalIdx] };
					const msgs = [...finalChat.messages];
					if (msgs[msgs.length - 1]?.role === "assistant") {
						msgs[msgs.length - 1].content = responseMsg.content;
					} else {
						msgs.push({ ...responseMsg });
					}
					finalChat.messages = msgs;
					finalChats[finalIdx] = finalChat;
					chatUtils.saveChats(finalChats);
				}
				return finalChats;
			});
		} catch (error) {
			if (error instanceof Error && error.name !== 'AbortError') {
				console.error('Regenerate error:', error);
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex-1 flex flex-col h-full">
			<div className="h-full w-full flex flex-col items-center justify-center">
				<div className="w-full max-w-3xl flex flex-col flex-1 h-full">
					<div className="flex items-center gap-4 p-4 justify-between">
						<div className="flex items-center gap-2">
							<span className="font-semibold text-lg">{currentChat?.title || "No Chat Selected"}</span>
							{currentChat && (
								<Button size="icon" variant="ghost" onClick={handleEditChatPrompt} className="cursor-pointer" aria-label="Edit chat system prompt" title="Edit chat system prompt">
									{currentChat.systemPrompt ? <FileText className="size-4" /> : <Plus className="size-4" />}
								</Button>
							)}
						</div>
						<Select value={model} onValueChange={handleModelChange}>
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="Select model" />
							</SelectTrigger>
							<SelectContent>
								{MODEL_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{currentChat?.systemPrompt && (
						<div className="px-4 pb-2 text-xs text-muted-foreground italic truncate" title={currentChat.systemPrompt}>
							Chat system prompt: {truncateWithEllipsis(currentChat.systemPrompt, 60)}
						</div>
					)}
					<div className="flex-1 flex flex-col min-h-0">
						<ScrollArea className="flex-1 p-4 min-h-0" style={{ minHeight: 0 }} ref={scrollRef}>
							<div className="flex flex-col gap-4 h-full justify-end">
								{currentChat?.messages.map((msg, idx) =>
									msg.role === "user" ? (
										<div key={msg.id} className="self-end w-full flex flex-col items-end group">
											<div className="bg-muted text-foreground rounded-2xl px-4 py-3 text-base break-words inline-block max-w-[75%]">
												{msg.content}
												{msg.files && msg.files.length > 0 && (
													<div className="mt-2 flex gap-2 flex-wrap">
														{msg.files.map((file, fidx) =>
															file.type.startsWith("image/") ? (
																<Image key={fidx} src={file.url} alt={file.name} width={96} height={96} className="w-24 h-24 object-cover rounded" />
															) : (
																<a key={fidx} href={file.url} download={file.name} className="underline text-xs text-white">
																	{file.name}
																</a>
															)
														)}
													</div>
												)}
											</div>
											<div className="flex gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => handleDeleteMessage(idx)}
													title="Delete this message"
													disabled={loading || !currentChatId}
													aria-label="Delete"
													className="cursor-pointer"
												>
													<Trash2 className="size-4 mr-1" />
												</Button>
											</div>
										</div>
									) : (
										<div key={msg.id} className="self-start w-full flex flex-col group">
											<div className="px-0 py-0 text-base break-words inline-block w-full" style={{ background: "none" }}>
												<ProseMarkdown>{msg.content}</ProseMarkdown>
												{msg.files && msg.files.length > 0 && (
													<div className="mt-2 flex gap-2 flex-wrap">
														{msg.files.map((file, idx) =>
															file.type.startsWith("image/") ? (
																<Image key={idx} src={file.url} alt={file.name} width={96} height={96} className="w-24 h-24 object-cover rounded" />
															) : (
																<a key={idx} href={file.url} download={file.name} className="underline text-xs">
																	{file.name}
																</a>
															)
														)}
													</div>
												)}
											</div>
											<div className="flex gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => handleRegenerateMessage(idx)}
													title="Regenerate this response"
													disabled={loading || !currentChatId}
													aria-label="Regenerate"
													className="cursor-pointer"
												>
													<RotateCcw className="size-4 mr-1" />
												</Button>
											</div>
										</div>
									)
								)}
							</div>
						</ScrollArea>
						<ChatInput
							currentChat={currentChat}
							chats={chats}
							setChats={setChats}
							currentChatId={currentChatId}
							model={model}
							overallSystemPrompt={overallSystemPrompt}
							chatUtils={chatUtils}
						/>
					</div>
				</div>
			</div>
			<SystemPromptModal
				show={showChatPromptModal}
				onClose={() => setShowChatPromptModal(false)}
				value={chatPromptDraft}
				setValue={setChatPromptDraft}
				chats={chats}
				setChats={setChats}
				currentChatId={currentChatId}
				setShowModal={setShowChatPromptModal}
				chatUtils={chatUtils}
				isChatPrompt
			/>
		</div>
	);
});

export default ChatArea;
