"use client";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import SystemPromptModal from "@/components/SystemPromptModal";

type Message = {
	id: string;
	role: "user" | "assistant";
	content: string;
	files?: FilePreview[];
};

type FilePreview = {
	name: string;
	url: string;
	type: string;
};

type Chat = {
	id: string;
	title: string;
	messages: Message[];
	createdAt: number;
	model: string;
	systemPrompt?: string;
};

const MODEL_OPTIONS = [
	{ value: "gpt-4o", label: "GPT-4o" },
	{ value: "o3-mini", label: "O3-Mini" },
];

export default function Home() {
	const [sidebarOpen, setSidebarOpen] = useState(false);
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
		<div className="flex h-screen">
			<Sidebar
				sidebarOpen={sidebarOpen}
				setSidebarOpen={setSidebarOpen}
				chats={chats}
				currentChatId={currentChatId}
				setChats={setChats}
				setCurrentChatId={setCurrentChatId}
				overallSystemPrompt={overallSystemPrompt}
				setShowOverallPromptModal={setShowOverallPromptModal}
				chatUtils={chatUtils}
			/>
			<ChatArea
				currentChat={currentChat}
				chats={chats}
				setChats={setChats}
				currentChatId={currentChatId}
				setCurrentChatId={setCurrentChatId}
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
		</div>
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
