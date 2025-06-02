'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Task } from '@/types/task';
import { useUser } from '@clerk/nextjs';

interface TaskContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, '_id' | 'createdAt' | 'createdBy' | 'createdByName' | 'status' | 'assignedTo' | 'assignedToName'> & { assignedTo?: string }) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  assignTask: (taskId: string, userId: string, userName: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user } = useUser();

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) {
        throw new Error(`Error fetching tasks: ${res.statusText}`);
      }
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      // Optionally, show an error message to the user
    }
  };

  useEffect(() => {
    if (user) { // Only fetch if user is authenticated
      fetchTasks();
    }
  }, [user]); // Refetch if user changes

  const addTask = async (taskData: Omit<Task, '_id' | 'createdAt' | 'createdBy' | 'createdByName' | 'status' | 'assignedTo' | 'assignedToName'> & { assignedTo?: string }) => {
    if (!user) return; // Ensure user is authenticated
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...taskData, createdBy: user.id, createdByName: user.fullName }),
      });

      if (!res.ok) {
        throw new Error(`Error adding task: ${res.statusText}`);
      }

      const newTask = await res.json();
      // Assuming the API returns the saved task with _id
      setTasks((prev) => [newTask.task, ...prev]); // Add new task to the beginning of the list
      fetchTasks(); // Re-fetch tasks to ensure consistency (optional, can optimize later)

    } catch (error) {
      console.error("Failed to add task:", error);
      // Optionally, show an error message to the user
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user) return; // Ensure user is authenticated
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error(`Error updating task: ${res.statusText}`);
      }

      // Update the task in the local state
      setTasks((prev) =>
        prev.map((task) => (task._id === taskId ? { ...task, ...updates } : task))
      );

    } catch (error) {
      console.error("Failed to update task:", error);
      // Optionally, show an error message to the user
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return; // Ensure user is authenticated
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(`Error deleting task: ${res.statusText}`);
      }

      // Remove the task from the local state
      setTasks((prev) => prev.filter((task) => task._id !== taskId));

    } catch (error) {
      console.error("Failed to delete task:", error);
      // Optionally, show an error message to the user
    }
  };

  const assignTask = async (taskId: string, userId: string, userName: string) => {
    if (!user) return; // Ensure user is authenticated
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignedTo: userId, assignedToName: userName }),
      });

      if (!res.ok) {
        throw new Error(`Error assigning task: ${res.statusText}`);
      }

      // Update the task in the local state
      setTasks((prev) =>
        prev.map((task) =>
          task._id === taskId
            ? { ...task, assignedTo: userId, assignedToName: userName }
            : task
        )
      );

    } catch (error) {
      console.error("Failed to assign task:", error);
      // Optionally, show an error message to the user
    }
  };

  return (
    <TaskContext.Provider
      value={{ tasks, addTask, updateTask, deleteTask, assignTask }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTask() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
} 