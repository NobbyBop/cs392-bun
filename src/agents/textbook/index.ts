import type { AgentRequest, AgentResponse, AgentContext } from "@agentuity/sdk";
/*
	Using a combo of pdf-lib and unpdf (which uses Mozilla pdf.js) here.
	pdf-lib splits the main textbook into a smaller pdf which
	unpdf can then extract text from.

	Note: I probably could pre-textify the textbook pdf to increase speed
	and not need to use pdf-lib or unpdf, but leaving in for proof-of-concept purposes.
*/
import { PDFDocument } from "pdf-lib";
import { definePDFJSModule, extractText, getDocumentProxy } from 'unpdf'

// Needs to use the legacy build for Bun.
await definePDFJSModule(async () => {
	const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
	// Needed to manually specify this, not found automatically for some reason?
	pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');;
	return pdfjs;
  });

import OpenAI from "openai";

const client = new OpenAI();

const textbookBytes = await Bun.file("src/agents/textbook/textbook.pdf").arrayBuffer();
const textbook = await PDFDocument.load(textbookBytes);

// The 12th page (0-indexed) of the PDF document is "page 1".
const OFFSET = 12;

interface userRequest{
	user: string;
	message: string;
	followUp: boolean;
	lastMessage: string;
	lastResponse: string;
}

function isValidRequest(data: userRequest | null | undefined): data is userRequest {
	if(data === undefined || data === null) return false;
	if(!data.user || !data.message || data.followUp === undefined || !data.lastMessage || !data.lastResponse) return false;
	if("string" != typeof data.user || "string" != typeof data.message || "boolean" != typeof data.followUp
		|| "string" != typeof data.lastMessage || "string" != typeof data.lastResponse) return false;
	return true;
}

function parsePageNums(data: string | null | undefined): number[] | null {
	if ("string" !== typeof data) return null;
	try {
	  const parsed = JSON.parse(data);
	  if(Array.isArray(parsed)){
		let ret = [];
		for(let num of parsed){
			if("number" === typeof num){
				ret.push(num);
			} else {
				return null;
			}
		}
		return ret;
	  }
	  return null;
	} catch {
		// Couldn't parse, agent produced incorrect output.
		return null;
	}
  }

export default async function Agent(
	req: AgentRequest,
	resp: AgentResponse,
	ctx: AgentContext,
) {
	let userReq: any = await req.data.json();
	// ctx.logger.debug("Got user input: ", userReq);
	if(!isValidRequest(userReq)) return resp.text("Invalid user input.");
	let userMsg = userReq.message;

	// If this happens to be a follow up question, the previous question should also be accounted for.
	let promptString1 = `
You will be given a user message and a Table of Contents (TOC) for a Systems Programming textbook.

The format of each line in the TOC is: Section Number, Section Title, Start Page.

It is your job to select between 1-3 SECTIONS from the the textbook based what
you believe will best answer the message. Please PAGE NUMBERS in [] associated with each section, separated by commas.
Your final result should have at between 1-7 pages total. NO MORE THAN 5 pages.

Note: to determine which page numbers go with which sections look at where your chosen section begins, 
and choose consecutive pages between (inclusive) your chosen section and the next section. (They will all not be explicitly listed.)

Example:
	"I want to know about cars"
	TOC: 
	...
	4.5 Cars (page 10)
	4.7 Not Cars (page 13)
	...
	5.5 Tangentially Related To Cars (page 26)
	5.6 Nothing to do with Cars at all (page 27)
	...
	You would want to choose section 4.5 and 5.5
	One possible selection of pages could be: [10, 11, 12, 13, 26, 27]

Do not include anything other than the page numbers in your response. If you do not believe the message is related to the textbook,
return an empty [].

The message: "${userMsg}"
The TOC: "${TOC}"
	`
	if(userReq.followUp) promptString1 += `
The first message is a follow-up to this message: "${userReq.lastMessage}"
To which you replied: "${userReq.lastResponse}"
You may consider this original interaction in addition to the message you were given
to determine page numbers, which still must be in [] separated by commas.
`
	const completion1 = await client.chat.completions.create({
		messages: [
			{
				role: "user",
				content: promptString1,
			},
		],
		model: "gpt-4o-mini",
	});

	const pageNumsResp = completion1.choices[0]?.message.content;
	ctx.logger.debug("Agent selected pages: ", pageNumsResp);
	let pageNums = parsePageNums(pageNumsResp);
	if(pageNums === null) return resp.text("Cannot answer that with the textbook.")
	
	// return resp.text(pageNumsResp?? "Got nothing");
	// Creating an intermediate PDF that contains only the pages the agent selected.
	let resultPDF = await PDFDocument.create();
	let copiedPages = await resultPDF.copyPages(textbook, pageNums);
	for(const page of copiedPages){
		resultPDF.addPage(page);
	}
	// Here is the intermediate pdf from which we can extract text.
	let resultBytes = await resultPDF.save();

	// Now use unpdf to extract it.
	let parsingPDF = await getDocumentProxy(resultBytes);
	const {text} = await extractText(parsingPDF, {mergePages:true});
	// return resp.text(text);

	let promptString2 =`
You are going to receieve a user message and an exerpt(s) from the a Systems Programming textbook.
Based on only the exerpts, try to respond to the message. Use the exerpt(s) as your primary source
for your response. Keep your response clear and concise (no more than 5 sentences for the most
complicated response). End your message with "Textbook Pages:${pageNumsResp}."

The message: "${userMsg}"
The exerpts: "${text}"
	`
	if(userReq.followUp) promptString2 += `
The first message is a follow-up to this message: "${userReq.lastMessage}"
To which you replied: "${userReq.lastResponse}"
You may use this interaction to assist with your response. Please acknowledge the follow-up and that you will do better this time before responding.
`

	// Finally, we ask the agent to answer the question based on the selected pages from the textbook!
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

	// TODO: figure out how to also return the relevant pdf pages.
	return resp.text(response ?? "Problem generating response.");
}

/*
	This TOC will be used by the agent to request specific pages of the PDF.
	Requiring the agent to use this first will protect it against reading the entire PDF every time
	when only specific sections are required.
*/

const TOC =`
Contents
1 What the Shell? (page 1)
1.1 File Organization (page 1)
1.1.1 Navigating through File Hierarchy (page 2)
1.1.2 Examining Files (page 2)
1.1.3 Creating and Deleting Files (page 3)
1.2 Environment Variables (page 3)
1.3 Special Characters (page 5)
1.3.1 Redirection (page 5)
1.3.1.1 Make Output Disappear (page 5)
1.3.1.2 Standard Error (page 6)
1.3.2 Pipes (page 7)
1.4 Bash Script (page 8)
1.4.1 Evaluation (page 8)
1.4.1.1 Read Only Variables (page 9)
1.4.1.2 Commands (page 9)
1.4.1.3 Arithmetic (page 10)
1.4.2 Conditionals (page 10)
1.4.3 Arrays & Loops (page 11)
1.4.4 Functions (page 13)
1.4.5 Redirecting Standard Input and Here Documents (page 14)
1.4.5.1 Standard Input (page 14)
1.4.5.2 Here Documents (page 14)
1.4.6 User Interface (page 16)
1.4.6.1 Positional Arguments (page 16)
1.4.6.2 Arguments with Flags (page 16)
1.4.6.3 Using getopts (page 16)
2 C Programming Language (page 19)
2.1 Introduction (page 19)
2.1.1 Data Types (page 19)
2.1.1.1 Primitive Types (page 19)
2.1.1.2 Arrays (page 20)
2.1.1.3 Character Arrays (aka Strings) (page 21)
2.1.1.4 C struct (page 21)
2.1.2 Functions (page 22)
2.1.3 Command-line Arguments (page 23)
2.1.4 Return or Exit? (page 24)
2.2 C Standard I/O Library (page 25)
2.2.1 Streams & Standard I/O Streams (page 25)
2.2.2 Opening & Closing a Stream (page 26)
2.2.3 Reading Lines from Files (page 27)
2.3 Error Handling (page 28)
2.4 Pointers (page 29)
2.4.1 Pass by Value (page 31)
2.4.2 NULL Pointers (page 34)
2.4.3 void Pointers (page 34)
2.4.4 Function Pointers (page 36)
2.5 Dynamic Memory Management (page 38)
2.5.1 A Brief Introduction to Process Image (page 38)
2.5.1.1 Read-Only Segment (page 39)
2.5.1.2 Read/Write Segment (page 39)
2.5.1.3 Stack (page 39)
2.5.1.4 Heap (page 40)
2.5.2 Dynamic Allocation (page 40)
2.5.3 Memory Leak (page 41)
2.5.4 Multi-Dimensional Arrays (page 42)
2.6 C Compilation Process (page 43)
2.6.1 Preprocessor (page 43)
2.6.1.1 Macros (page 43)
2.6.1.2 Macro Parameters (page 45)
2.6.1.3 Conditional Macros (page 45)
2.6.2 Using Makefile (page 47)
2.6.2.1 Compilation (page 48)
2.6.2.2 Using Variables (page 49)
3 Systems Programming Concepts (page 51)
3.1 The Kernel (page 51)
3.2 Kernel Space and User Space (page 52)
3.3 System Calls (page 53)
3.4 A Really Brief Timeline on UNIX (page 54)
4 File Subsystem (page 57)
4.1 Basic Concepts of Files (page 57)
4.1.1 The ls Command (page 57)
4.1.2 File Types (page 58)
4.1.3 File Permissions (page 58)
4.1.3.1 Character Representation (page 59)
4.1.3.2 Octal Representation (page 59)
4.1.3.3 Special Permissions (page 59)
4.1.4 Index Nodes (inode) (page 60)
4.2 Retrieving File Information (page 61)
4.2.1 The stat Command (page 61)
4.2.2 The stat Struct (page 62)
4.2.3 The stat() Function (page 62)
4.2.4 The st_mode Variable (page 63)
4.2.4.1 Extracting File Types from st_mode (page 64)
4.2.4.2 Extracting File Permissions from st_mode (page 64)
4.3 Reading Directories (page 65)
4.3.1 Basic Concept of Directories (page 66)
4.3.2 The DIR Type (page 67)
4.3.3 Opening & Closing Directories (page 68)
4.3.4 Opening & Checking Directories (page 68)
4.3.5 Navigating Directories (page 69)
4.3.5.1 Getting Current Working Directory (page 69)
4.3.5.2 Changing Directory (page 70)
4.3.6 Creating & Deleting Directories (page 71)
4.4 File I/O (page 71)
4.4.1 File Description (page 71)
4.4.2 I/O System Calls (page 72)
4.4.2.1 Opening & Closing a File (page 72)
4.4.2.2 Reading & Writing a File (page 73)
4.4.2.3 Caution 1: Operating on Bytes (page 74)
4.4.2.4 Caution 2: Expectation vs Reality (page 74)
4.4.3 File Reposition (page 76)
4.5 Buffering (page 76)
4.5.1 Kernel Space Buffering (page 77)
4.5.2 User Space Buffering (page 78)
4.5.2.1 Streams (page 78)
4.5.2.2 Fully Buffered (page 80)
4.5.2.3 Line Buffered (page 81)
4.5.2.4 Unbuffered (page 82)
4.5.3 Summary (page 83)
5 Process Control Subsystem (page 85)
5.1 Introduction (page 85)
5.1.1 Process Image (page 85)
5.1.2 The /proc/ Virtual File System (page 87)
5.1.3 Process States (page 87)
5.1.4 System Process Hierarchy (page 87)
5.2 Process Control (page 88)
5.2.1 Creating a Process (page 89)
5.2.2 Parent vs Child Processes (page 90)
5.2.3 Orphans and Zombies (page 90)
5.2.3.1 Orphan Processes (page 90)
5.2.3.2 Zombie Processes (page 91)
5.2.3.3 The wait() Function & Status Macros (page 93)
5.2.3.4 The waitpid() Function (page 95)
5.3 Executing Programs (page 96)
5.3.1 Suffix p (page 97)
5.3.2 Passing Vector vs Passing List (page 97)
5.3.3 Process Image Replacement (page 98)
5.3.3.1 Redirection (page 99)
5.3.4 The system() Function (page 100)
5.4 Organization of Processes (page 101)
5.4.1 Background and Foreground Processes (page 101)
5.4.2 Groups and Sessions (page 102)
5.4.3 Relations (page 104)
5.5 Processes & File Descriptions (page 105)
5.5.1 Single Process (page 105)
5.5.2 Unrelated Processes (page 106)
5.5.3 Parent-Child Processes (page 107)
5.6 Signals (page 108)
5.6.1 General Concepts of Signal (page 108)
5.6.1.1 System Standard Signals (page 108)
5.6.1.2 Sending & Receiving Signals (page 109)
5.6.1.3 Signal Disposition (page 109)
5.6.1.4 Pending & Blocked Signals (page 109)
5.6.2 Sending Signals (page 110)
5.6.2.1 Key-Binded Signals (page 110)
5.6.2.2 Using htop (page 110)
5.6.2.3 Using kill Command (page 110)
5.6.2.4 Using kill() Function (page 111)
5.6.3 Altering Default Actions (page 112)
5.6.3.1 Installing Signal Handlers (page 113)
5.6.3.2 Restoring Signals (page 114)
5.6.4 Properties of Signals (page 115)
5.6.4.1 Parent and Child (page 115)
5.6.4.2 Pending Signals (page 116)
5.6.4.3 Blocking Signals (page 117)
6 Inter-Process Communication (page 119)
6.1 Pipes (page 119)
6.1.1 Pipe Operator (page 120)
6.1.2 Creating a Pipe (page 120)
6.1.3 Sharing a Pipe (page 122)
6.1.4 Implementing the Pipe Operator (page 123)
6.1.4.1 Duplicating File Descriptors (page 124)
6.1.4.2 Race Conditions (page 125)
6.1.4.3 Atomic Operations (page 126)
6.1.5 Pipe Capacity (page 127)
6.2 FIFO (page 127)
6.2.1 A Simple Server-Client Example (page 127)
6.2.1.1 Server (page 128)
6.2.1.2 Client (page 129)
6.2.2 Why Is FIFO an Empty File? (page 130)
6.3 Sockets (page 130)
6.3.1 Introduction (page 130)
6.3.1.1 Connection Types (page 131)
6.3.1.2 Network Addresses (page 131)
6.3.1.3 Port (page 131)
6.3.1.4 Domains and Protocol Families (page 132)
6.3.1.5 Socket Types (page 132)
6.3.2 Writing a Server (page 133)
6.3.2.1 Typical Steps (page 133)
6.3.2.2 Create Sockets (page 134)
6.3.2.3 Bind (page 134)
6.3.2.4 Binding (page 136)
6.3.2.5 Listen (page 137)
6.3.2.6 Accept (page 137)
6.3.3 Writing a Client (page 138)
6.3.4 Putting It All Together (page 138)
6.3.4.1 Server Code (page 138)
6.3.4.2 Client Code (page 139)
6.3.5 Communication (page 140)
6.3.5.1 Sending & Receiving Data (page 140)
6.3.6 Multiplexed Server-Client Model (page 142)
6.3.6.1 Multiplexed I/O Model (page 143)
6.3.6.2 File Descriptor Sets (page 144)
6.3.6.3 Select (page 145)
6.3.6.4 Ready? (page 146)
6.3.6.5 Writing a Multiplexed Echo Server (page 147
`