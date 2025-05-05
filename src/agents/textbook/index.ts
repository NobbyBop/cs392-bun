import type { AgentRequest, AgentResponse, AgentContext } from "@agentuity/sdk";
import OpenAI from "openai";

const client = new OpenAI();

// The 13th page of the PDF document is "page 1".
const OFFSET = 13;

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

export default async function Agent(
	req: AgentRequest,
	resp: AgentResponse,
	ctx: AgentContext,
) {
	let userReq: any = await req.data.json();
	ctx.logger.debug("Got user input: ", userReq);
	if(!isValidRequest(userReq)) return resp.text("Invalid user input.");
	let userMsg = userReq.message;

	/*
		TODO - Have the agent decide what pages to pull from the textbook.
		Then, in a separate call, have the agent read those pages to try to answer the question.
	*/

	return resp.text('Hi from Agentuity!');
}

/*
	This table of contents will be used by the agent to request specific pages of the PDF.
	Requiring the agent to use this first will protect it against reading the entire PDF every time
	when only specific sections are required.
*/

const TOC =`
Contents
1 What the Shell?	1
1.1 File Organization	1
1.1.1 Navigating through File Hierarchy	2
1.1.2 Examining Files	2
1.1.3 Creating and Deleting Files	3
1.2 Environment Variables	3
1.3 Special Characters	5
1.3.1 Redirection	5
1.3.1.1 Make Output Disappear	5
1.3.1.2 Standard Error	6
1.3.2 Pipes	7
1.4 Bash Script	8
1.4.1 Evaluation	8
1.4.1.1 Read Only Variables	9
1.4.1.2 Commands	9
1.4.1.3 Arithmetic	10
1.4.2 Conditionals	10
1.4.3 Arrays & Loops	11
1.4.4 Functions	13
1.4.5 Redirecting Standard Input and Here Documents	14
1.4.5.1 Standard Input	14
1.4.5.2 Here Documents	14
1.4.6 User Interface	16
1.4.6.1 Positional Arguments	16
1.4.6.2 Arguments with Flags	16
1.4.6.3 Using getopts	16
2 C Programming Language	19
2.1 Introduction	19
2.1.1 Data Types	19
2.1.1.1 Primitive Types	19
2.1.1.2 Arrays	20
2.1.1.3 Character Arrays (aka Strings)	21
2.1.1.4 C struct	21
2.1.2 Functions	22
2.1.3 Command-line Arguments	23
2.1.4 Return or Exit?	24
2.2 C Standard I/O Library	25
2.2.1 Streams & Standard I/O Streams	25
2.2.2 Opening & Closing a Stream	26
2.2.3 Reading Lines from Files	27
2.3 Error Handling	28
2.4 Pointers	29
2.4.1 Pass by Value	31
2.4.2 NULL Pointers	34
2.4.3 void Pointers	34
2.4.4 Function Pointers	36
2.5 Dynamic Memory Management	38
2.5.1 A Brief Introduction to Process Image	38
2.5.1.1 Read-Only Segment	39
2.5.1.2 Read/Write Segment	39
2.5.1.3 Stack	39
2.5.1.4 Heap	40
2.5.2 Dynamic Allocation	40
2.5.3 Memory Leak	41
2.5.4 Multi-Dimensional Arrays	42
2.6 C Compilation Process	43
2.6.1 Preprocessor	43
2.6.1.1 Macros	43
2.6.1.2 Macro Parameters	45
2.6.1.3 Conditional Macros	45
2.6.2 Using Makefile	47
2.6.2.1 Compilation	48
2.6.2.2 Using Variables	49
3 Systems Programming Concepts	51
3.1 The Kernel	51
3.2 Kernel Space and User Space	52
3.3 System Calls	53
3.4 A Really Brief Timeline on UNIX	54
4 File Subsystem	57
4.1 Basic Concepts of Files	57
4.1.1 The ls Command	57
4.1.2 File Types	58
4.1.3 File Permissions	58
4.1.3.1 Character Representation	59
4.1.3.2 Octal Representation	59
4.1.3.3 Special Permissions	59
4.1.4 Index Nodes (inode)	60
4.2 Retrieving File Information	61
4.2.1 The stat Command	61
4.2.2 The stat Struct	62
4.2.3 The stat() Function	62
4.2.4 The st_mode Variable	63
4.2.4.1 Extracting File Types from st_mode	64
4.2.4.2 Extracting File Permissions from st_mode	64
4.3 Reading Directories	65
4.3.1 Basic Concept of Directories	66
4.3.2 The DIR Type	67
4.3.3 Opening & Closing Directories	68
4.3.4 Opening & Checking Directories	68
4.3.5 Navigating Directories	69
4.3.5.1 Getting Current Working Directory	69
4.3.5.2 Changing Directory	70
4.3.6 Creating & Deleting Directories	71
4.4 File I/O	71
4.4.1 File Description	71
4.4.2 I/O System Calls	72
4.4.2.1 Opening & Closing a File	72
4.4.2.2 Reading & Writing a File	73
4.4.2.3 Caution 1: Operating on Bytes	74
4.4.2.4 Caution 2: Expectation vs Reality	74
4.4.3 File Reposition	76
4.5 Buffering	76
4.5.1 Kernel Space Buffering	77
4.5.2 User Space Buffering	78
4.5.2.1 Streams	78
4.5.2.2 Fully Buffered	80
4.5.2.3 Line Buffered	81
4.5.2.4 Unbuffered	82
4.5.3 Summary	83
5 Process Control Subsystem	85
5.1 Introduction	85
5.1.1 Process Image	85
5.1.2 The /proc/ Virtual File System	87
5.1.3 Process States	87
5.1.4 System Process Hierarchy	87
5.2 Process Control	88
5.2.1 Creating a Process	89
5.2.2 Parent vs Child Processes	90
5.2.3 Orphans and Zombies	90
5.2.3.1 Orphan Processes	90
5.2.3.2 Zombie Processes	91
5.2.3.3 The wait() Function & Status Macros	93
5.2.3.4 The waitpid() Function	95
5.3 Executing Programs	96
5.3.1 Suffix p	97
5.3.2 Passing Vector vs Passing List	97
5.3.3 Process Image Replacement	98
5.3.3.1 Redirection	99
5.3.4 The system() Function	100
5.4 Organization of Processes	101
5.4.1 Background and Foreground Processes	101
5.4.2 Groups and Sessions	102
5.4.3 Relations	104
5.5 Processes & File Descriptions	105
5.5.1 Single Process	105
5.5.2 Unrelated Processes	106
5.5.3 Parent-Child Processes	107
5.6 Signals	108
5.6.1 General Concepts of Signal	108
5.6.1.1 System Standard Signals	108
5.6.1.2 Sending & Receiving Signals	109
5.6.1.3 Signal Disposition	109
5.6.1.4 Pending & Blocked Signals	109
5.6.2 Sending Signals	110
5.6.2.1 Key-Binded Signals	110
5.6.2.2 Using htop	110
5.6.2.3 Using kill Command	110
5.6.2.4 Using kill() Function	111
5.6.3 Altering Default Actions	112
5.6.3.1 Installing Signal Handlers	113
5.6.3.2 Restoring Signals	114
5.6.4 Properties of Signals	115
5.6.4.1 Parent and Child	115
5.6.4.2 Pending Signals	116
5.6.4.3 Blocking Signals	117
6 Inter-Process Communication	119
6.1 Pipes	119
6.1.1 Pipe Operator	120
6.1.2 Creating a Pipe	120
6.1.3 Sharing a Pipe	122
6.1.4 Implementing the Pipe Operator	123
6.1.4.1 Duplicating File Descriptors	124
6.1.4.2 Race Conditions	125
6.1.4.3 Atomic Operations	126
6.1.5 Pipe Capacity	127
6.2 FIFO	127
6.2.1 A Simple Server-Client Example	127
6.2.1.1 Server	128
6.2.1.2 Client	129
6.2.2 Why Is FIFO an Empty File?	130
6.3 Sockets	130
6.3.1 Introduction	130
6.3.1.1 Connection Types	131
6.3.1.2 Network Addresses	131
6.3.1.3 Port	131
6.3.1.4 Domains and Protocol Families	132
6.3.1.5 Socket Types	132
6.3.2 Writing a Server	133
6.3.2.1 Typical Steps	133
6.3.2.2 Create Sockets	134
6.3.2.3 Bind	134
6.3.2.4 Binding	136
6.3.2.5 Listen	137
6.3.2.6 Accept	137
6.3.3 Writing a Client	138
6.3.4 Putting It All Together	138
6.3.4.1 Server Code	138
6.3.4.2 Client Code	139
6.3.5 Communication	140
6.3.5.1 Sending & Receiving Data	140
6.3.6 Multiplexed Server-Client Model	142
6.3.6.1 Multiplexed I/O Model	143
6.3.6.2 File Descriptor Sets	144
6.3.6.3 Select	145
6.3.6.4 Ready?	146
6.3.6.5 Writing a Multiplexed Echo Server	147
`