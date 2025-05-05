import type { AgentRequest, AgentResponse, AgentContext } from "@agentuity/sdk";
import OpenAI from "openai";

const client = new OpenAI();

// Just the most basic agent, user talks to LLM and gets a response.
// Note: there is NO memory on agents unless specifically handled.
export default async function Agent(
	req: AgentRequest,
	resp: AgentResponse,
	ctx: AgentContext,
) {
	let userMsg = await req.data.text();
	const completion = await client.chat.completions.create({
		messages: [
			{
				role: "user",
				content: "Keep your response to just one sentence: "+ userMsg,
			},
		],
		model: "gpt-4o",
	});

	let crsp = completion.choices[0]?.message;
	let message = crsp?.content;
	return resp.text(message ?? "Didn't get a response.");
}