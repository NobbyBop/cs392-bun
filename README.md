# CS 392: Systems Programming Helper Agents
This example project provides a set of agents that can help students with logistical, conceptual, and practical questions about the Systems Programming course at SIT.

## Flow
A user will send a question or instruction to the Chat agent, which will categorize the question and forward it to the relevant auxillary agent. That agent will then generate a response based on the question and some prior context.

## Agents

### Chat
This is the agent that the user will interact with. Categorizes the message into one of 4 categories: Logistics, Textbook, Code, or Nonsense.
Alternatively, a question can be marked as a Follow-Up which will send it to the most recently used agent.  
Receives messages in the format:
```
{
        "user": "username",
        "message": "your message here",
        "testing": true (optional, default false)
}
```
Notes:  
Username is currenly only used for tracking previous interactions, no authentication.  
Output in testing mode uses gpt-4o-mini instead of gpt-4o. Results are very similar in both modes, so often test mode is enough for simple questions.

### Logistics
The simplest category - takes the user question and cross-checks the provided course info and syllabus to find the answer.  
Some example messages that would be forwarded to Logistics:
```
{
        "user": "Student",
        "message": "What time does class start on Monday for Section A?",
}
{
        "user": "Student",
        "message": "What about for Section B?",
}
```

### Textbook
Handles conceptual questions about the course.
First, uses the textbook table of contents to pick out pages from the textbook pdf which are relevant to the question.
Then, extracts the text from those pages and uses them to answer the question. Also tells students which pages of the textbook to read for more information.
Students can ask the agent general questions about any of the topics below:
Shell Programming, C Programming Language, Systems Programming Concepts, File Subsystem, Process Control Subsystem,
and Inter-Process Communication.  
Some example messages that would be forwarded to Textbook:
```
{
        "user": "Student",
        "message": "What is the difference between a zombie and orphan process?",
}
{
        "user": "Student",
        "message": "Give me an example of using fork() in C.",
}
```
### Code
Operates similarly to textbook, but handles more specific coding questions about one of the six course assignments.
Takes the question, and determines which assignment the question is referencing.
Then, takes the assignment instructions and solution to help answer the question without revealing the solution.
Students can ask the agent about any of the six assignments below.
1. rbin - a bash scripting assignment where students must create a new command "rbin" that functions as a recycle bin in the command line.
2. bst - an assignment in C where students must complete the operationsof a binary search tree. Generating nodes, traversing the tree, etc.
3. pfind - an assignment in C where students must search directories for files matching the input permission string (i.e. rwxrwxrwx)
4. minishell - a mini shell, written in C. Students must implement several commands and emulate the functionality of a shell. Involves signal handling. Knowledge of forks(), etc.
5. sl - Students must utilize pipes to sort the output of ls. Knowledge of forks(), dup2(), etc.
6. trivia - Students must utilize sockets to create a client and server that runs a real-time trivia game.  
Some example messages that would be forwarded to Code:
```
{
        "user": "Student",
        "message": "I'm working on the recycling assignment, how can I create the sample directory?",
}
{
        "user": "Student",
        "message": "My destroy function isn't working for bst. \n void destroy(tree_t* tr){ \n if (tr->root != NULL) { \n destroy_all(tr->root); \n tr->root=NULL; \n } \n }",
}
```
