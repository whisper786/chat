export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  stream?: MediaStream;
}

export interface Message {
  id: string;
  type: 'user' | 'system';
  senderId?: string; // Optional for system messages
  senderName?: string; // Optional for system messages
  text: string;
}
