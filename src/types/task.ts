export interface Task {
  _id?: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 