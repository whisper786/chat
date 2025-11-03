export interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isHost?: boolean;
}
