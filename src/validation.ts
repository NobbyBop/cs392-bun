/*
	An interface and function for validating requests sent to the auxilary agents:
		Logistics
		Textbook
		Code
*/

interface userRequest{
	user: string;
	message: string;
	followUp: boolean;
	lastMessage: string;
	lastResponse: string;
}

export function isValidRequest(data: userRequest | null | undefined): data is userRequest {
	if(data === undefined || data === null) return false;
	if(!data.user || !data.message || data.followUp === undefined || !data.lastMessage || !data.lastResponse) return false;
	if("string" != typeof data.user || "string" != typeof data.message || "boolean" != typeof data.followUp
		|| "string" != typeof data.lastMessage || "string" != typeof data.lastResponse) return false;
	return true;
}