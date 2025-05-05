import type { AgentRequest, AgentResponse, AgentContext } from "@agentuity/sdk";
import OpenAI from "openai";

const client = new OpenAI();
// const filePath = `${import.meta.dir}/knowledge.txt`;
// const courseInfo = await Bun.file(filePath).text();

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
	// ctx.logger.debug("Got user input: ", userReq);
	if(!isValidRequest(userReq)) return resp.text("Invalid user input.");
	let userMsg = userReq.message;
	let userName = userReq.user;
	let contentString =`
You are going to receive a logistical message about the course CS 392: Systems Programming.
Below you will find a knowledge base from which you can pull to answer this message. When possible,
pull directly from the knowledge base as your answer. You may use some reason to answer questions, 
but admitting you cannot find the answer is better than an incorrect answer. Keep your answer brief 
(no more than 3 sentences for the most complicated response.)
If the message is nonsensical or cannot be answered with the knowledge base below first look to see 
if it is a follow up, and if not, send a simple message saying you cannot respond. 
You can do the same for trivial greetings, farewells, and thank you's. 
Here is the message: "${userMsg}"
Here is the knowledge base: "${courseInfoString}"
`
	// If this is a follow up, let the LLM know about it.
	if(userReq.followUp){
		// ctx.logger.debug("Adding the follow-up information.");
		contentString =`
* This is a follow-up message from this previous interaction.
User: "${userReq.lastMessage}"
You: "${userReq.lastResponse}"
` + contentString;
	}
	// ctx.logger.debug("About to relay the message to logisics.");
	const completion = await client.chat.completions.create({
		messages: [
			{
				role: "user",
				content: contentString,
			},
		],
		// This is a really easy task so I am using a less intense model.
		model: "gpt-4o-mini",
	});
	let response = completion.choices[0]?.message.content;
	return resp.text(response ?? "Didn't get a response.");
}

//Course info here, putting below so it is out of the way.
const courseInfoString = `Lecture Time
Section A: MWF, 10am @ GS-122;
Section B: MWF, 11am @ McLean 105;
Section C/D: MWF, 1pm/2pm @ Babbio 122.
 
Staff
Instructor: Shudong Hao
Office hours: Mon/Fri 3:30pm -- 4:30pm @ GS-245;

CAs, Office Hours, Location:
Matt Bernardon, Monday 11am-1pm, GS347
Andrew Schomber, Monday 3pm-5pm, GS348
Marcos Traverso, Monday 3pm-5pm, GS226
Daniel Zamloot, Tuesday 10am-12pm, GS224
Joseph DePalo, Tuesday 1pm-3pm, GS226
Josh Bernstein, Tuesday 1pm-3pm, GS347
Nick Mirigliani, Tuesday 2pm-4pm, GS348
Dean Zazzera, Wednesday 10:30am-12:30pm, GS226
Ryan Monaghan, Friday 1pm-3pm, GS224

Syllabus
1 Course Overview
1.1 Course Description
Introduction to systems programming in C on UNIX. Students will be introduced to tools for compilation, dy-
namic linking, and debugging. Some aspects of the UNIX system call interface will be studied, drawn from this
list: process creation, signals, terminal I/O, file I/O, inter-process communication, network protocol stacks, and
programming with sockets.
1.2 Learning Objectives
After successful completion of this course, students will be able to:
Use the Linux system, including the terminal and Linux commands;
Create C programs that conform to the specification of Linux platform, including C grammars, compiling,
and linking;
Create makefiles and perform debugging with tools like gdb;
Create a client/server based application using sockets;
Develop applications that perform files accesses;
Develop applications that create new processes and allow them to communicate with each other through
channels like signals, pipes, or shared memory;
Explain basic concepts of networking;
1.3 Format and Structure
This course comprises three lectures per week, homework assignments, projects, and exams.
1.4 Course Materials
Textbook: Systems Programming. 3rd Edition. Shudong Hao. Free access on Canvas.

2 Assessment
2.1 Grading Items
All work must be done individually.
Homework assignments (5): 40%;
Project (1): 20%;
Midterm Exam: 20%;
Endterm Exam: 20%.
2.2 Extra Credit Policy
We strongly encourage students start and finish all coursework as early as possible. To this end, we offer an
earlybird extra credit opportunity. The earlybird deadline is two days before regular deadline. For example, if
homework 1 is due 9/30/2023, 11:59PM EST, the earlybird deadline is 9/28/2023, 11:59PM EST.
Any work submitted before the earlybird deadline will be given 2% extra credit, which will be applied to the
grade received for that work. To receive this extra credit, the submission cannot be changed/modified after the
earlybird deadline; otherwise, no extra credit will be given.
Earlybird extra credit cannot be applied to extensions.
2.3 Late Submission Policy
All the assignments, including homework assignments and project, need to be submitted before the deadline.
For each hour that a submission is late, 2% of your points will be deducted. The lateness penalty rounds up to the
nearest hour—that is, an assignment that is 1 hour and 5 seconds late will receive a 4% late penalty. In addition
to our extensions policy (see next section), everyone gets one no-questions-asked 3-day (including weekends
and holidays) extension.
2.4 Extensions Policy
Extensions will be given on an individual basis. This section details the policy on extensions. To request an
extension, you must use the request form link on Canvas. Regardless of type of extensions, you must apply
before the deadline of the item you’re requesting extension for, including NQA (see below).
Until you receive confirmation, it is not advisable to assume the extension is approved. For special cases where
the application cannot be submitted early, the course staff will review them on a case-by-case basis.
2.4.1 No-Questions-Asked (NQA) Extensions
Life happens, and we would like to support you through those times. Therefore, everyone has one time no-
questions-asked 3-day extension. This grants you three days of extension on any item you choose, but you
cannot split it for different items. It cannot be applied retroactively either.
2.4.2 Extenuating Circumstances
We also strive to create a fair environment for everyone, so no extension will be granted without a valid cause.
If an extension is granted, the student will have three days of extension without penalty. After three days, the late
policy described in Section 2.3 will be applied.
Please note that only one extension is allowed for each item.
The following lists most common excuses. Other excuses not listed below will be considered on a case-by-case
basis.
Athletic events: to receive extensions, the course instructor needs an email from the athletics department.
Note that the student has to be competing in that event; only participating or observing does not count;
Student activities: some student activities may occupy a large amount of time, which may prevent the student
from finishing the assignments on time, such as student council. Please be aware that these activities are
voluntary, so no extensions can be granted for that;
Family emergency: if there’s a family emergency, the student will be granted a two-day extension. Exceptions
will need further proof and will be granted on a case by case basis. Please note that emergencies involving
individuals not biologically related to the student themselves, such as boy/girlfriends, besties, etc., do not
count as family emergencies, and extensions will not be granted. Please also understand the definition of
“emergency”: an event that can be planned beforehand is not considered as an emergency;
Physical illness: we do not accept doctor’s notes. If the student has a medical condition or health emergency,
please visit the Student Health Service first. Upon receiving a confirmation email directly from the Student
Health Service, the student will be granted a two-day extension;
Mental health: we care about everyone’s mental health and take it very seriously. If the student couldn’t
perform well because of mental health issues such as depression, please contact Counseling and Psycho-
logical Services as soon as possible, and get diagnosed and treated first. Upon receiving an email directly
from the office for an accommodation, the student will be granted a two-day extension.
2.5 Grading Dispute Policy
Note: a correctly calculated grade is an accurate reflection of a student’s work. We grade on work quality, not
individual’s efforts or the number of hours put into the work.
Students are encouraged to bring their graded work to either the instructor or the CAs to understand the grading,
and in some cases, to modify erroneous gradings. We establish the following terms for grading dispute:
To dispute a grading, the student has to bring the work back to either the instructor or the CAs within
two business days of grade release, no exceptions. After two business days, no grade can be changed;
When bringing the work and its grading, the student has to clearly state the possible wrong grading item
in the rubric, why their work satisfies the item, and how many points they should receive back;
Any grading rubric at the point of submission deadline is a contract between the student and the course,
so no arguments about rubric item are accepted. For example, “Item X does not make sense so I should
get the points back” will not receive any response from course staff;
Attempting to solicit and/or negotiate a grade that’s not earned according to the rubrics is considered
as academic dishonesty and bribery. The student will be reported and disqualified for any further grade
dispute;
Due to The Family Educational Rights Privacy Act (FERPA) regulations, the course staff has right not to
discuss grades with any party — including parents — other than the student themselves. When there’s a
disagreement, please reach out to the instructor first;
We ask any student bringing a grading dispute to respect course staff and to behave in a professional
manner. Any inappropriate and disrespectful behavior will cancel the student’s opportunity for all future
grading dispute, and will guarantee a report to the Stevens Student Code of Conduct Committee.

3 Academic Integrity
3.1 Undergraduate Honor System
Enrollment into the undergraduate class of Stevens Institute of Technology signifies a student’s commitment to
the Honor System. Accordingly, the provisions of the Stevens Honor System apply to all undergraduate students
in coursework and Honor Board proceedings. It is the responsibility of each student to become acquainted
3
with and to uphold the ideals set forth in the Honor System Constitution. More information about the Honor
System including the constitution, bylaws, investigative procedures, and the penalty matrix can be found online
at http://web.stevens.edu/honor/.
The following pledge shall be written in full and signed by every student on all submitted work (including, but not
limited to, homework, projects, lab reports, code, quizzes and exams) that is assigned by the course instructor.
No work shall be graded unless the pledge is written in full and signed.
“I pledge my honor that I have abided by the Stevens Honor System.”
Students who believe a violation of the Honor System has been committed should report it within ten business
days of the suspected violation. Students have the option to remain anonymous and can report violations online
at http://www.stevens.edu/honor.
3.2 Honor System Reporting
For any potential violation of academic integrity in this class, a report will be filed to the Honor System. We do
not give “First-Time” forgiveness. Once a report is filed, all communication will have to go through the Honor
System; the course staff will not negotiate or discuss the incident without the involvement of the Honor System.
3.3 Generative AI Use
You may use AI programs e.g., ChatGPT to help generate ideas and brainstorm. However, you should note that
the material generated by these programs may be inaccurate, incomplete, or otherwise problematic. Beware
that use may also stifle your own independent thinking and creativity.
You may not submit any work that contains content generated by an AI program as your own. Any plagiarism
or other form of cheating will be dealt with under relevant Stevens policies.
3.4 Learning Accommodations
Stevens Institute of Technology is dedicated to providing appropriate accommodations to students with docu-
mented disabilities. The Office of Disability Services (ODS) works with undergraduate and graduate students
with learning disabilities, attention deficit-hyperactivity disorders, physical disabilities, sensory impairments,
psychiatric disorders, and other such disabilities in order to help students achieve their academic and personal
potential. They facilitate equal access to the educational programs and opportunities offered at Stevens and
coordinate reasonable accommodations for eligible students. These services are designed to encourage inde-
pendence and self-advocacy with support from the ODS staff. The ODS staff will facilitate the provision of
accommodations on a case-by-case basis.
For more information about Disability Services and the process to receive accommodations, visit https://www.
stevens.edu/office-disability-services. If you have any questions please contact: Phillip Gehman, the
Director of Disability Services Coordinator at Stevens Institute of Technology at pgehman@stevens.edu or by
phone 201-216-3748.
3.5 Disability Services Confidentiality Policy
Student Disability Files are kept separate from academic files and are stored in a secure location within the
Office of Disability Services. The Family Educational Rights Privacy Act (FERPA, 20 U.S.C. 1232g; 34CFR,
Part 99) regulates disclosure of disability documentation and records maintained by Stevens Disability Services.
According to this act, prior written consent by the student is required before our Disability Services office may
release disability documentation or records to anyone. An exception is made in unusual circumstances, such as
the case of health and safety emergencies.

C:\Users\nicho\OneDrive - stevens.edu\Agentuity\cs392-bun\src\agents\logistics\knowledge.txt`