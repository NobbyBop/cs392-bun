import type { AgentRequest, AgentResponse, AgentContext } from "@agentuity/sdk";
import OpenAI from "openai";

const client = new OpenAI();

function isValidCategory(value: string | null | undefined): value is string {
	return value !== undefined && value !== null && ["0", "1", "2", "3", "F"].includes(value);
}
interface userRequest{
	user: string;
	message: string;
	testing?: boolean;
}

function isValidRequest(data: userRequest | null | undefined): data is userRequest {
	if(data == undefined || data == null) return false;
	if(!data.user || !data.message) return false;
	if("string" != typeof data.user || "string" != typeof data.message) return false;
	return true;
}

/*
This agent will take requests format {user:string, message:string} from the user and do the following things:
	1. Categorize it into one of three options:
		0. Logistics - relating to course logistics.
		1. Textbook - relating to course concepts covered in the textbook.
		2. Code - relating to the programming assignments for the class.
		OR
		3. Nonsense - if the user's message cannot be put into any of those three categories.
	2. Sends the request to the relevant agent. 
		(Keeps # of tokens needed down when only answering simple questions, logistics for example.)
	3. Receieves response from other agent and displays to user.
	4. Record user-specific information about most recent session: category, message, response in Key-Value pair.
*/

export default async function Agent(
	req: AgentRequest,
	resp: AgentResponse,
	ctx: AgentContext,
) {
	// Extracting data from request, checking if in proper format.
	let userReq: any = await req.data.json();
	if(!isValidRequest(userReq)) return resp.text(`Invalid user input.
Must be of the format:
{
	"user": "username",
	"message": "your message here",
	"testing": true (optional, default false)
}`);
	let userMsg = userReq.message;
	let userName = userReq.user;
	
	// Setting up prompt, adding last category used if applicable.
	let contentString =`
The Systems Programming Course (CS 392) covers a six main topics spread across different chapters:
Shell Programming, C Programming Language, Systems Programming Concepts, File Subsystem, Process Control Subsystem,
and Inter-Process Communication.
You are going to receieve a student question/instruction related to CS 392.
It is your job to categorize this message as one of the following:
0. Logistics 
	- relating to course logistics.
	- course info, hours, meeting times, policies, etc.
1. Textbook 
	- relating to Systems Programming concepts covered in one of the six textbook chapters. 
	- if it is a general programming question, you should select this category.
2. Code 
	- asks about specific code or functionality for a specific homework assignment.
		-homework assignments include: rbin, bst, pfind, minishell, sl, and trivia (project)
	- asks for feedback about specific piece of code.
	- general questions about assignments can be considered logistical.
F. Follow-Up 
	- appears to be asking for repetition, elaboration, or clarification.
	- uses correcting language like "no".
	- makes unclear references like "this" or "that".

If you decide that the input from the user cannot fall into any of those categories you can place it in a fourth category:
3. Nonsense 
	- an input which cannot be handled as it is not relevant to Systems Programming. 
	- should be reserved for messages that are clearly unanswerable.
	- vague questions should be considered follow-ups most of the time.

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

	let agent, result, response;
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
				// ctx.logger.debug("Follow up detected: ", {lastCategory, lastMessage, lastResponse})
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
				// ctx.logger.debug("Got to category 0.");
				agent = await ctx.getAgent({id: "agent_91e4a332fc4502fab17070c01f82c005"});
				result = await agent.run({data:{
					user:userName, 
					message:userMsg, 
					followUp:isFollowUp, 
					lastMessage:lastMessageString??"N/A",
					lastResponse:lastResponseString??"N/A"
				}, contentType:"application/json"});
				response = await result.data.text();
				break;
			case "1":
				// ctx.logger.debug("Got to category 1.");
				agent = await ctx.getAgent({id: "agent_07b5ae013c8c0fb17bb71cc221742bd6"});
				result = await agent.run({data:{
					user:userName, 
					message:userMsg, 
					followUp:isFollowUp, 
					lastMessage:lastMessageString??"N/A",
					lastResponse:lastResponseString??"N/A"
				}, contentType:"application/json"});
				response = await result.data.text();
				break;
			case "2":
				// ctx.logger.debug("Got to category 2.");
				agent = await ctx.getAgent({id: "agent_3f979e28e59008c034198ef28ef675b9"});
				result = await agent.run({data:{
					user:userName, 
					message:userMsg, 
					followUp:isFollowUp, 
					lastMessage:lastMessageString??"N/A",
					lastResponse:lastResponseString??"N/A"
				}, contentType:"application/json"});
				response = await result.data.text();
				break;
			default:
				break;
		}
	} 
	// Remembering the last message.
	ctx.kv.set("last-message", userName, userMsg);
	// Remembering the last response.
	ctx.kv.set("last-response", userName, response ?? "Received nonsense message.");
	return resp.text(response ?? "Received nonsense message.");
}
