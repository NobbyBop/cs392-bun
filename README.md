# CS 392: Systems Programming Helper Agents
This example project provides a set of agents that can help students with logistical, conceptual, and practical questions about the Systems Programming course at SIT.

## Flow
A user will send a question or instruction to the Chat agent, which will categorize the question and forward it to the relevant auxillary agent. That agent will then generate a response based on the question and some prior context.

## Agents

### Chat
This is the agent that the user will interact with.
Receives messages in the format:
```
{
        "user": "username",
        "message": "your message here",
        "testing" (optional): true (default false) //testing switches model to gpt-4o-mini
}
```
Categorizes the message into one of 4 categories: Logistics, Textbook, Code, and Nonsense.
Alternatively, a question can be marked as a Follow-Up which will send it to the most recently used agent.

### Logistics
The simplest category - takes the user question and cross-checks the provided course info and syllabus to find the answer.

### Textbook
Handles conceptual questions about the course.
First, uses the textbook table of contents to pick out pages from the textbook pdf which are relevant to the question.
Then, extracts the text from those pages and uses them to answer the question.

### Code
Operates similarly to textbook, but handles more specific coding questions about assignments.
Takes the question, and determines which assignment the question is referencing.
Then, takes the assignment instructions and solution to help answer the question without revealing solution.
