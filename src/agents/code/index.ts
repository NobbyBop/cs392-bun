import type { AgentRequest, AgentResponse, AgentContext } from "@agentuity/sdk";
import { isValidRequest } from "../../validation";
// See Textbook agent for explanation of pdf-related imports and methodology.
import { PDFDocument } from "pdf-lib";
import { definePDFJSModule, extractText, getDocumentProxy } from 'unpdf'
await definePDFJSModule(async () => {
	const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
	pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');;
	return pdfjs;
  });

import OpenAI from "openai";

const client = new OpenAI();

/*
  Homework resources: Will generate strings for each of the c files first (quick), and do pdfs as needed.
  In this example
  HW1 - rbin (Recycle Bin)
  	hw_rbin.pdf
	rbin.sh
  HW2 - bst (Binary Search Tree)
  	hw_bst.pdf
	bstree.c
  HW3 - pfind (Permission Find)
  	hw_pfind.pdf
	pfind.c
  HW4 - minishell
  	hw_minishell.pdf
	minishell.c
  HW5 - sl (Sorted ls)
  	hw_sl.pdf
	sl.c
  Project - Trivia
  	hw_trivia.pdf
	server.c
	client.c
*/

const hw1txt = await Bun.file("src/agents/code/resources/rbin.sh").text();
const hw2txt = await Bun.file("src/agents/code/resources/bstree.c").text();
const hw3txt = await Bun.file("src/agents/code/resources/pfind.c").text();
const hw4txt = await Bun.file("src/agents/code/resources/minishell.c").text();
const hw5txt = await Bun.file("src/agents/code/resources/sl.c").text();
let servertxt = "<SERVER>\n" + await Bun.file("src/agents/code/resources/server.c").text();
let clienttxt = "<CLIENT>\n" + await Bun.file("src/agents/code/resources/client.c").text();
const triviatxt = servertxt + "\n" + clienttxt;

// Creating arrays to easily index where the agent should reference based on
// determined assignment number.
const solutions = [hw1txt, hw2txt, hw3txt, hw4txt, hw5txt, triviatxt];
const pdfNames = ["rbin", "bst", "pfind", "minishell", "sl", "trivia"];
export default async function Agent(
	req: AgentRequest,
	resp: AgentResponse,
	ctx: AgentContext,
) {
	let userReq: any = await req.data.json();
	if(!isValidRequest(userReq)) return resp.text("Invalid user input.");
	let userMsg = userReq.message;
	let promptString1 = `
You are going to receive a question regarding homework for a Systems Programming class. It is your
job to decide what assignment the question is referencing. The assignments are as follows:

Format: Assignment #. Assignment Name (Aliases) - Description
1. rbin (Recycle Bin, HW1) - a bash scripting assignment where students must create a new command 
"rbin" that functions as a recycle bin in the command line.
2. bst (Binary Search Tree, bstree, HW2) - an assignment in C where students must complete the operations
of a binary search tree. Generating nodes, traversing the tree, etc.
3. pfind (Permissions Find, HW3) - an assignment in C where students must search directories for files matching
the input permission string (i.e. rwxrwxrwx)
4. minishell (HW4) - a mini shell, written in C. Students must implement several commands and emulate the functionality
of a shell. Involves signal handling. Knowledge of forks(), etc.
5. sl (HW5) - Students must utilize pipes to sort the output of ls. Knowledge of forks(), dup2(), etc.
6. trivia (project) - Students must utilize sockets to create a client and server that runs a real-time trivia game.

The user question: "${userMsg}"

Please respond with a single number [1-6] with the assignment you feel this is most related to. If you believe the question
is not related to an assignment, respond with 0.
	`;

	if(userReq.followUp) promptString1 += `
The first question is a follow-up to this message: "${userReq.lastMessage}"
To which you replied: "${userReq.lastResponse}"
You may consider this original interaction in addition to the message you were given
when deciding which assignment to choose.
`;

	const completion1 = await client.chat.completions.create({
		messages: [
			{
				role: "user",
				content: promptString1,
			},
		],
		model: "gpt-4o-mini",
	});
	const assignmentNumberResponse = completion1.choices[0]?.message.content;
	ctx.logger.debug("Determined assignment: ", assignmentNumberResponse);
	// return resp.text("testing");
	if(!["1", "2", "3", "4", "5", "6"].includes(assignmentNumberResponse??"0")) return resp.text("Failed to determine assignment number.");

	let pdfName = pdfNames[parseInt(assignmentNumberResponse??"0")-1];
	let solution = solutions[parseInt(assignmentNumberResponse??"0")-1];

	const pdfBytes = await Bun.file(`src/agents/code/resources/hw_${pdfName}.pdf`).arrayBuffer();
	let parsingPDF = await getDocumentProxy(pdfBytes);
	const {text} = await extractText(parsingPDF, {mergePages:true});

	let promptString2 = `
You are going to receieve a question about a homework assignment from a student.
You will be given the instructions and the solution below.
Do your best to answer the student's question, but be sure to never disclose
the solution file. You may explain concepts about the relevant programming language
and how they apply to the assignment, debug code, and give students guidance.
Keep your response technical and concise, no need to provide guidance unless specifically asked for.

Example:
	"my function() is not working"

	You may explain the proper use of function() and how it applies to the assignment,
	but do not provide next steps. Remember, this is an assignment, and it is important
	that the student utlizes the textbook and figures most of it out independently.

The two documents (instructions and solution) should be your PRIMARY source when
generating a response to the question below. Your response should never exceed 5 sentences (plus code blocks if applicable).

The instructions: "${text}"
The solution: "${solution}"
The student question: "${userMsg}"
	`;
	if(userReq.followUp) promptString2 += `
The first question is a follow-up to this message: "${userReq.lastMessage}"
To which you replied: "${userReq.lastResponse}"
You may consider this original interaction in addition to the message you were given
when creating a response.
`;
	const completion2 = await client.chat.completions.create({
		messages: [
			{
				role: "user",
				content: promptString2,
			},
		],
		model: "gpt-4o-mini",
	});

	const response = completion2.choices[0]?.message.content;
	return resp.text(response??"Could not answer question.");
}

