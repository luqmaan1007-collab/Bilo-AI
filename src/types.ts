export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  image?: string;
  fileName?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  grokMode: 'fun_rebel' | 'normal_witty';
  modelSelected?: string;
}
