"use client";
import { useEffect, useRef, useState } from "react";
import ChatArea from "@/components/ChatArea";
import SystemPromptModal from "@/components/SystemPromptModal";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import type { Chat } from "@/lib/types";

export default function Home() {
	const [chats, setChats] = useState<Chat[]>([]);
	const [currentChatId, setCurrentChatId] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	const [overallSystemPrompt, setOverallSystemPromptState] = useState<string>("");
	const [showOverallPromptModal, setShowOverallPromptModal] = useState(false);

	useEffect(() => {
		setOverallSystemPromptState(chatUtils.getOverallSystemPrompt());
	}, []);

	useEffect(() => {
		const stored = chatUtils.getStoredChats();
		setChats(stored);
		if (stored.length > 0) setCurrentChatId(stored[0].id);
	}, []);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [currentChatId, chats]);

	const currentChat = chats.find((c) => c.id === currentChatId);

	return (
		<SidebarProvider>
			<AppSidebar
				chats={chats}
				currentChatId={currentChatId}
				setChats={setChats}
				setCurrentChatId={setCurrentChatId}
				setShowOverallPromptModal={setShowOverallPromptModal}
				chatUtils={chatUtils}
			/>
			<SidebarTrigger />
			<main className="flex h-screen flex-1 flex flex-col">
				<ChatArea
					currentChat={currentChat}
					chats={chats}
					setChats={setChats}
					currentChatId={currentChatId}
					overallSystemPrompt={overallSystemPrompt}
					scrollRef={scrollRef}
					chatUtils={chatUtils}
				/>
				<SystemPromptModal
					show={showOverallPromptModal}
					onClose={() => setShowOverallPromptModal(false)}
					value={overallSystemPrompt}
					setValue={setOverallSystemPromptState}
					chatUtils={chatUtils}
					setShowModal={setShowOverallPromptModal}
					isChatPrompt={false}
				/>
			</main>
		</SidebarProvider>
	);
}

// Utility functions grouped at the bottom
const chatUtils = {
	getOverallSystemPrompt(): string {
		if (typeof window === "undefined") return "";
		return localStorage.getItem("overallSystemPrompt") || "";
	},
	setOverallSystemPrompt(prompt: string) {
		localStorage.setItem("overallSystemPrompt", prompt);
	},
	getStoredChats(): Chat[] {
		if (typeof window === "undefined") return [];
		try {
			return JSON.parse(localStorage.getItem("chats") || "[]");
		} catch {
			return [];
		}
	},
	saveChats(chats: Chat[]) {
		localStorage.setItem("chats", JSON.stringify(chats));
	},
};
