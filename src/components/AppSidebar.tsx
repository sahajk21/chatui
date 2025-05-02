import { Plus, SquareTerminal, MoreHorizontal } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarGroupAction,
	SidebarFooter,
} from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import { v4 as uuidv4 } from "uuid";
import type { Chat } from "@/lib/types";

type SidebarProps = {
	chats: Chat[];
	currentChatId: string | null;
	setChats: (chats: Chat[]) => void;
	setCurrentChatId: (id: string | null) => void;
	setShowOverallPromptModal: (show: boolean) => void;
	chatUtils: any;
};

export function AppSidebar({ chats, currentChatId, setChats, setCurrentChatId, setShowOverallPromptModal, chatUtils }: SidebarProps) {
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
		<Sidebar variant="sidebar" collapsible="offcanvas">
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Chat</SidebarGroupLabel>
					<SidebarGroupAction title="New Chat" onClick={handleNewChat}>
						<Plus /> <span className="sr-only">New Chat</span>
					</SidebarGroupAction>
					<SidebarGroupContent>
						<SidebarMenu>
							{chats.map((chat) => (
								<SidebarMenuItem key={chat.id} onClick={() => setCurrentChatId(chat.id)}>
									<SidebarMenuButton asChild isActive={currentChatId === chat.id}>
										<div className="text-2xs">
											<span title={chat.systemPrompt}>{chat.title}</span>
											{chat.systemPrompt && <SquareTerminal />}
										</div>
									</SidebarMenuButton>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<SidebarMenuAction>
												<MoreHorizontal />
											</SidebarMenuAction>
										</DropdownMenuTrigger>
										<DropdownMenuContent side="right" align="start">
											<DropdownMenuItem onClick={() => handleRenameChat(chat.id)}>
												<span>Rename</span>
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => handleDeleteChat(chat.id)}>
												<span>Delete</span>
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem key="overall-system-prompt" onClick={() => setShowOverallPromptModal(true)}>
						<SidebarMenuButton asChild>
							<span>Overall System Prompt</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
