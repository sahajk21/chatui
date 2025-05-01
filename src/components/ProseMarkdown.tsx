import React from "react";
import ReactMarkdown from "react-markdown";

export default function ProseMarkdown({ children }: { children: string }) {
	return (
		<div className="prose max-w-none prose-neutral dark:prose-invert prose-pre:bg-muted prose-pre:text-inherit prose-pre:rounded-lg prose-pre:p-3 prose-p:leading-relaxed prose-p:my-2 prose-img:rounded">
			<ReactMarkdown>{children}</ReactMarkdown>
		</div>
	);
}
