import type { AgentRequest, AgentResponse, AgentContext } from "@agentuity/sdk";
import OpenAI from "openai";

const client = new OpenAI();

function isValidCategory(value: string | null | undefined): value is string {
	return value !== undefined && value !== null && ["0", "1", "2", "3", "F"].includes(value);
}
interface userRequest{
	user: string;
	message: string;
}

function isValidRequest(data: userRequest | null | undefined): data is userRequest {
	if(data == undefined || data == null) return false;
	if(!data.user || !data.message) return false;
	if("string" != typeof data.user || "string" != typeof data.message) return false;
	return true;
}

/*
This agent will take requests (as plain text) from the user and do the following things:
	1. Categorize it into one of three options:
		0. Logistics - relating to course logistics.
		1. Textbook - relating to course concepts covered in the textbook.
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
	// Extracting data from request, checking if in proper format.
	let userReq: any = await req.data.json();
	if(!isValidRequest(userReq)) return resp.text("Invalid user input.");
	let userMsg = userReq.message;
	let userName = userReq.user;
	
	// Setting up prompt, adding last category used if applicable.
	let contentString =`
Below is a message from a student regarding the course CS 392: Systems Programming. 
It is your job to categorize this response as one of the following:
0. Logistics - relating to course logistics.
1. Textbook - relating to course concepts covered in the textbook.
2. Code - asks about a specific homework assignment.
F. Follow-Up - appears to be asking for repetition, elaboration, or clarification.
If you decide that the input from the user cannot fall into any of those categories you can place it in a fourth category:
3. Nonsense - an input which cannot be handled as it is not relevant to the course.

The student message is as follows: 
"${userMsg}"

Please respond with only the CODE [0-3 or F] associated with the category you believe the message falls under.
`
	// Sending message to OpenAI.
	const categoryResponse = await client.chat.completions.create({
		messages: [
			{
				role: "user",
				content: contentString,
			},
		],
		model: "gpt-4o-mini",
	});

	// Extract the category from the response.
	let category = categoryResponse.choices[0]?.message.content;

	let agent, result, message;
	let isFollowUp = false;
	if(isValidCategory(category)){
		ctx.logger.debug("Decided a category: " + category);

		// If the category is F that means this is a follow-up question, so before sending off to another agent, 
		// get the context of the last interaction. We only need to run this if the question is marked as follow up.
		let lastCategoryString, lastMessage, lastMessageString, lastResponse, lastResponseString;

		if(category === "F") {
			isFollowUp = true;
			let lastCategory = await ctx.kv.get("last-category", userName);
			if(lastCategory.exists){ 
				// If there is a last category, get it. Also, get the last message and response.
				lastCategoryString = await lastCategory.data.text()
				lastMessage = await ctx.kv.get("last-message", userName);
				if(lastMessage.exists) lastMessageString = await lastMessage.data.text();
				else lastMessageString = "N/A";
				lastResponse = await ctx.kv.get("last-response", userName);
				if(lastResponse.exists) lastResponseString = await lastResponse.data.text();
				else lastResponseString = "N/A";
				ctx.logger.debug("Follow up detected: ", {lastCategory, lastMessage, lastResponse})
			}
			// If the question was marked as a follow-up, and there was no previous interaction to follow up on, 
			// OR the previous category was Nonsense then the current category is marked as (3) Nonsense.
			if (lastCategoryString === "3") category = "3";
			category = lastCategoryString??"3";
		}

		// Update the context, regardless of whether this is a follow up.
		await ctx.kv.set("last-category", userName, category);
		
		switch(category){
			case "0":
				ctx.logger.debug("Got to category 0.");
				agent = await ctx.getAgent({id: "agent_91e4a332fc4502fab17070c01f82c005"});
				result = await agent.run({data:{
					user:userName, 
					message:userMsg, 
					followUp:isFollowUp, 
					lastMessage:lastMessageString??"N/A",
					lastResponse:lastResponseString??"N/A"
				}, contentType:"application/json"});
				message = await result.data.text();
				break;
			default:
				break;
		}
	} 
	// Remembering the last message.
	ctx.kv.set("last-message", userName, userMsg);
	// Remembering the last response.
	ctx.kv.set("last-response", userName, message ?? "Received nonsense message.");
	return resp.text(message ?? "Received nonsense message.");
}
