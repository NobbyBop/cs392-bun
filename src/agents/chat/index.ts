import type { AgentRequest, AgentResponse, AgentContext } from "@agentuity/sdk";
import OpenAI from "openai";

const client = new OpenAI();



function isValidCategory(value: string | null | undefined): boolean {
	return value !== undefined && value !== null && ["0", "1", "2", "3"].includes(value);
}

/*
This agent will take requests (as plain text) from the user and do the following things:
	1. Categorize it into one of three options:
		0. Logistics - relating to course logistics.
		1. Concepts - relating to course concepts covered in the textbook.
		2. Code - relating to the programming assignments for the class.
		OR
		3. Nonsense - if the user's message cannot be put into any of those three categories.
	2. Hands off the request to the relevant agent. 
		(Keeps # of tokens down when only answering logistics questions for example.)
*/

export default async function Agent(
	req: AgentRequest,
	resp: AgentResponse,
	ctx: AgentContext,
) {
	let userMsg = await req.data.text();
	// The first agent categorizes the message entered by the user.
	const categoryResponse = await client.chat.completions.create({
		messages: [
			{
				role: "user",
				content: `
Below is a message from a student regarding the course CS 392: Systems Programming. 
It is your job to categorize this response as one of the following:
0. Logistics - relating to course logistics.
1. Concepts - relating to course concepts covered in the textbook.
2. Code - asks about a specific homework assignment.
If you decide that the input from the user cannot fall into any of those categories you can place it in a fourth category:
3. Nonsense - an input which cannot be handled as it is not relevant to the course.

The student message is as follows: 
"${userMsg}"

Please respond with only the NUMBER [0-3] associated with the category you believe the message falls under.
					`,
			},
		],
		model: "gpt-4o",
	});

	// Extract the category from the response.
	let crsp = categoryResponse.choices[0]?.message;
	let category = crsp?.content;

	let agent;
	let result;
	let message;
	if(isValidCategory(category)){
		console.log(category);
		
		switch(category){
			case "0":
				agent = await ctx.getAgent({id: "agent_91e4a332fc4502fab17070c01f82c005"});
				result = await agent.run({data:{input:userMsg}, contentType:"application/json"});
				message = await result.data.text();
				break;
			default:
				break;
		}
	} 
	
	return resp.text(message ?? "I don't know what you mean...");
}
