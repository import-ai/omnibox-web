export interface User {
  id: string;
  email: string;
  username: string;
  password?: string;
  password_repeat?: string;
  created_at: string;
  updated_at: string;
}
