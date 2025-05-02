import { NextRequest, NextResponse } from "next/server";

type ChatFile = { name: string; type: string; data: string };
type ChatMessage = {
	role: string;
	content: string;
	files?: { name: string; type: string }[];
};

export async function POST(req: NextRequest) {
	let messages: ChatMessage[] = [];
	let model: string = "";
	const files: { [key: string]: ChatFile } = {};

	const contentType = req.headers.get("content-type") || "";
	if (contentType.startsWith("multipart/form-data")) {
		const formData = await req.formData();
		messages = JSON.parse(formData.get("messages") as string) as ChatMessage[];
		model = formData.get("model") as string;

		for (const [key, value] of formData.entries()) {
			if (key.startsWith("file_") && value instanceof File) {
				const file = value as File;
				const arrayBuffer = await file.arrayBuffer();
				const base64 = Buffer.from(arrayBuffer).toString("base64");
				files[key] = {
					name: file.name,
					type: file.type,
					data: base64,
				};
			}
		}
	} else {
		const body = await req.json();
		messages = body.messages as ChatMessage[];
		model = body.model;
	}

	const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
	const apiKey = process.env.AZURE_OPENAI_KEY!;
	const deployment = model;
	const mappedMessages = messages.map((m: ChatMessage) => {
		const contentArr: { type: string; text?: string; image_url?: { url: string } }[] = [];
		if (m.files && m.files.length > 0) {
			m.files.forEach((f: { name: string; type: string }, idx: number) => {
				if (f.type.startsWith("image/")) {
					const fileKey = `file_${f.name}_${idx}`;
					const fileData = files[fileKey];
					if (fileData) {
						contentArr.push({
							type: "image_url",
							image_url: {
								url: `data:${f.type};base64,${fileData.data}`,
							},
						});
					}
				}
			});
		}
		if (m.content && m.content.trim() !== "") {
			contentArr.unshift({
				type: "text",
				text: m.content,
			});
		}
		if (contentArr.length === 0) {
			contentArr.push({ type: "text", text: "" });
		}
		return { role: m.role, content: contentArr };
	});

	console.log("Mapped messages:", JSON.stringify(mappedMessages, null, 2));

	const body: Record<string, unknown> = {
		messages: mappedMessages,
		stream: true,
	};

	if (model === "o3-mini") {
		body.max_completion_tokens = 16384;
	} else {
		body.max_tokens = 16384;
		body.temperature = 0.7;
	}

	const res = await fetch(`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-12-01-preview`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"api-key": apiKey,
		},
		body: JSON.stringify(body),
	});

	if (!res.ok || !res.body) {
		console.error("Error from Azure OpenAI:", res.status, res.statusText, await res.text());
		return NextResponse.json({ result: "Error from Azure OpenAI." }, { status: 500 });
	}

	const stream = new ReadableStream({
		async start(controller) {
			const decoder = new TextDecoder();
			let buffer = "";
			const reader = res.body!.getReader();
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";
					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed || !trimmed.startsWith("data:")) continue;
						const data = trimmed.replace(/^data:\s*/, "");
						if (data === "[DONE]") {
							controller.close();
							return;
						}
						try {
							const json = JSON.parse(data);
							const delta = json.choices?.[0]?.delta?.content;
							if (typeof delta === "string") {
								controller.enqueue(new TextEncoder().encode(delta));
							}
						} catch {
							// ignore malformed lines
						}
					}
				}
				controller.close();
			} catch (err) {
				controller.error(err);
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "no-cache",
		},
	});
}
