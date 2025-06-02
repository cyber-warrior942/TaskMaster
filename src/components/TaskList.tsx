'use client';

import { useState } from 'react';
import { useTask } from '@/context/TaskContext';
import { useUser } from '@clerk/nextjs';
import TaskForm from './TaskForm';

interface TaskListProps {
  isEnterprise?: boolean;
  employees?: Array<{ id: string; name: string }>;
  showAddTaskButton?: boolean;
}

export default function TaskList({ isEnterprise, employees, showAddTaskButton }: TaskListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const { tasks, updateTask, deleteTask, assignTask } = useTask();
  const { user } = useUser();

  const userRole = user?.publicMetadata?.role;
  const isAdmin = userRole === 'admin';

  const handleStatusChange = (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    updateTask(taskId, { status: newStatus });
  };

  const handleAssignTask = (taskId: string, userId: string, userName: string) => {
    assignTask(taskId, userId, userName);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tasks</h2>
        {isAdmin && isEnterprise && showAddTaskButton && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Task
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <TaskForm
              onClose={() => {
                setIsFormOpen(false);
                setEditingTask(null);
              }}
              initialTask={editingTask ? tasks.find((t) => t.id === editingTask) : undefined}
              taskId={editingTask || undefined}
            />
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {tasks.map((task) => (
            <li key={task._id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <span>Created by: {task.createdByName}</span>
                    {task.assignedToName && (
                      <span className="ml-4">Assigned to: {task.assignedToName}</span>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : task.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
                <div className="ml-4 flex items-center space-x-4">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      handleStatusChange(task._id, e.target.value as 'pending' | 'in-progress' | 'completed')
                    }
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>

                  {isAdmin && isEnterprise && employees && (
                    <select
                      value={task.assignedTo || ''}
                      onChange={(e) => {
                        const employee = employees.find((emp) => emp.id === e.target.value);
                        if (employee) {
                          handleAssignTask(task._id, employee.id, employee.name);
                        }
                      }}
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Assign to...</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {isAdmin && isEnterprise && (
                    <button
                      onClick={() => {
                        setEditingTask(task._id);
                        setIsFormOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                  )}

                  {isAdmin && isEnterprise && (
                    <button
                      onClick={() => deleteTask(task._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 