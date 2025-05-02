import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SquarePen, Settings, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatDropdown from "@/components/ChatDropdown";
import { v4 as uuidv4 } from "uuid";

type FilePreview = {
	name: string;
	url: string;
	type: string;
};

type Message = {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	files?: FilePreview[];
};

type Chat = {
	id: string;
	title: string;
	messages: Message[];
	createdAt: number;
	model: string;
	systemPrompt?: string;
};

type SidebarProps = {
	sidebarOpen: boolean;
	setSidebarOpen: (open: boolean) => void;
	chats: Chat[];
	currentChatId: string | null;
	setChats: (chats: Chat[]) => void;
	setCurrentChatId: (id: string | null) => void;
	overallSystemPrompt: string;
	setShowOverallPromptModal: (show: boolean) => void;
	chatUtils: any; // Replace with a specific type if available
};

export default function Sidebar({
	sidebarOpen,
	setSidebarOpen,
	chats,
	currentChatId,
	setChats,
	setCurrentChatId,
	overallSystemPrompt,
	setShowOverallPromptModal,
	chatUtils,
}: SidebarProps) {
	function truncateWithEllipsis(text: string, maxLength: number) {
		if (!text) return "";
		return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
	}

	function handleSelectChat(id: string) {
		setCurrentChatId(id);
		setSidebarOpen(false);
	}

	function handleDeleteChat(id: string) {
		const updated = chats.filter((c) => c.id !== id);
		setChats(updated);
		if (currentChatId === id && updated.length > 0) setCurrentChatId(updated[0].id);
		else if (updated.length === 0) setCurrentChatId(null);
		chatUtils.saveChats(updated);
	}

	function handleRenameChat(id: string) {
		const chatIdx = chats.findIndex((c) => c.id === id);
		if (chatIdx === -1) return;
		const currentTitle = chats[chatIdx].title;
		const newTitle = window.prompt("Rename chat", currentTitle);
		if (newTitle && newTitle.trim() && newTitle !== currentTitle) {
			const updated = [...chats];
			updated[chatIdx] = { ...updated[chatIdx], title: newTitle.trim() };
			setChats(updated);
			chatUtils.saveChats(updated);
		}
	}

	function handleNewChat() {
		const newChat: Chat = {
			id: uuidv4(),
			title: "New Chat",
			messages: [],
			createdAt: Date.now(),
			model: chats[0]?.model || "gpt-4o",
		};
		const updated = [newChat, ...chats];
		setChats(updated);
		setCurrentChatId(newChat.id);
		chatUtils.saveChats(updated);
	}

	return (
		<>
			<Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
				<SheetTrigger asChild>
					<Button variant="ghost" className="absolute top-4 left-4 z-20 sm:hidden cur">
						Chats
					</Button>
				</SheetTrigger>
				<SheetContent side="left" className="w-80 p-0 bg-muted">
					<div className="flex flex-col h-full">
						<div className="flex items-center justify-between p-4">
							<span className="font-bold text-lg">Chats</span>
							<div className="flex gap-1">
								<Button
									size="icon"
									variant="ghost"
									onClick={() => setShowOverallPromptModal(true)}
									className="cursor-pointer"
									aria-label="Edit overall system prompt"
									title="Edit overall system prompt"
								>
									<Settings className="size-4" />
								</Button>
								<Button size="icon" variant="ghost" onClick={handleNewChat} className="cursor-pointer" aria-label="New chat" title="New chat">
									<SquarePen className="size-4" />
								</Button>
							</div>
						</div>
						<ScrollArea className="flex-1">
							<ul>
								{chats.map((chat) => (
									<li key={chat.id} className={cn("flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted", currentChatId === chat.id && "bg-muted")}>
										<span onClick={() => handleSelectChat(chat.id)} className="truncate max-w-[120px] flex items-center gap-1">
											{chat.title}
											{chat.systemPrompt && (
												<span title="Chat-specific system prompt" className="text-xs text-primary ml-1">
													<FileText className="inline size-3" />
												</span>
											)}
										</span>
										<div className="relative flex items-center">
											<ChatDropdown onRename={() => handleRenameChat(chat.id)} onDelete={() => handleDeleteChat(chat.id)} />
										</div>
									</li>
								))}
							</ul>
						</ScrollArea>
						{overallSystemPrompt && (
							<div className="px-4 pb-4 pt-2 text-xs text-muted-foreground italic truncate" title={overallSystemPrompt}>
								Overall system prompt: {truncateWithEllipsis(overallSystemPrompt, 60)}
							</div>
						)}
					</div>
				</SheetContent>
			</Sheet>
			<div className="hidden sm:flex flex-col w-80 h-full bg-muted">
				<div className="flex items-center justify-between p-4">
					<span className="font-bold text-lg">Chats</span>
					<div className="flex gap-1">
						<Button
							size="icon"
							variant="ghost"
							onClick={() => setShowOverallPromptModal(true)}
							className="cursor-pointer"
							aria-label="Edit overall system prompt"
							title="Edit overall system prompt"
						>
							<Settings className="size-4" />
						</Button>
						<Button size="icon" variant="ghost" onClick={handleNewChat} className="cursor-pointer" aria-label="New chat" title="New chat">
							<SquarePen className="size-4" />
						</Button>
					</div>
				</div>
				<ScrollArea className="flex-1">
					<ul>
						{chats.map((chat) => (
							<li key={chat.id} className={cn("flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted", currentChatId === chat.id && "bg-muted")}>
								<span onClick={() => handleSelectChat(chat.id)} className="truncate max-w-[120px] flex items-center gap-1">
									{chat.title}
									{chat.systemPrompt && (
										<span title="Chat-specific system prompt" className="text-xs text-primary ml-1">
											<FileText className="inline size-3" />
										</span>
									)}
								</span>
								<div className="relative flex items-center">
									<ChatDropdown onRename={() => handleRenameChat(chat.id)} onDelete={() => handleDeleteChat(chat.id)} />
								</div>
							</li>
						))}
					</ul>
				</ScrollArea>
				{overallSystemPrompt && (
					<div className="px-4 pb-4 pt-2 text-xs text-muted-foreground italic truncate" title={overallSystemPrompt}>
						Overall system prompt: {truncateWithEllipsis(overallSystemPrompt, 60)}
					</div>
				)}
			</div>
		</>
	);
}
