// One conversation's messages and reply box, shared by the visitor's chat and the team's inbox.
// Code outside this folder imports only from here.
export { Thread, type ThreadProps } from "./components/thread";
export { useTyping } from "./hooks/use-typing";
export { ChatBox, ChatBoxField, ChatBoxSend } from "./components/chat-box";
