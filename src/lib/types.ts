export type FilePreview = {
	name: string;
	url: string;
	type: string;
};

export type Message = {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	files?: FilePreview[];
};

export type Chat = {
	id: string;
	title: string;
	messages: Message[];
	createdAt: number;
	model: string;
	systemPrompt?: string;
};
