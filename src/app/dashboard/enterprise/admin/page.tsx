'use client';

import { auth, useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import TaskList from '@/components/TaskList';
import SuccessAlert from '@/components/SuccessAlert';
import Link from 'next/link';

export default function EnterpriseAdminPage() {
  const { user, isLoaded } = useUser();
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState([]);
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', assignedTo: '' });
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successAlertMessage, setSuccessAlertMessage] = useState('');

  // Define fetchTasks outside useEffect
  const fetchTasks = useCallback(async () => {
     try {
        console.log('Fetching tasks...');
        const res = await fetch('/api/tasks');
        console.log('Fetch tasks response status:', res.status);
        if(res.ok) {
           const data = await res.json();
           console.log('Fetched tasks data:', data);
           setTasks(data);
           console.log('Tasks state updated:', data);
        } else {
           console.error('Failed to fetch tasks.', res.status);
           setTasks([]);
        }
     } catch (error) {
        console.error('Error fetching tasks:', error);
        setTasks([]);
     }
  }, []); // Add dependencies if fetchTasks relies on component state/props

  const fetchMembers = useCallback(async (adminId: string) => {
    try {
      // Pass the adminId to the API call
      console.log('Fetching enterprise members for admin:', adminId);
      const res = await fetch(`/api/enterprise-members?adminId=${adminId}`);
       console.log('Fetch members response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Fetched members data:', data);
        setEmployees(data);
      } else {
        console.error('Failed to fetch enterprise members.', res.status);
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching enterprise members:', error);
      setEmployees([]);
    }
  }, []); // Add dependencies if fetchMembers relies on component state/props

  useEffect(() => {
    // Fetch members and tasks only if user is loaded and is an admin
    if (isLoaded && user?.publicMetadata.plan === 'enterprise' && user?.publicMetadata.role === 'admin') {
        console.log('User loaded and is admin, fetching data...');
        fetchMembers(user.id); // Pass the current admin's ID
        fetchTasks(); // Call fetchTasks here too
    } else if (isLoaded && user) {
       console.log('User loaded but not admin, publicMetadata:', user.publicMetadata);
    }

  }, [isLoaded, user, fetchMembers, fetchTasks]); // Add fetchMembers and fetchTasks to dependencies

  // This redirect logic based on user metadata should ideally be handled by middleware,
  // but we keep a client-side check here for immediate feedback if user navigates directly.
  // The debug metadata display helps confirm the user's status.
  if (isLoaded && (!user || user.publicMetadata.plan !== 'enterprise' || user.publicMetadata.role !== 'admin')) {
      redirect('/dashboard');
  }

  const handleSendInvitation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inviteEmail) {
        alert('Please enter an email address.');
        return;
    }

    setLoading(true);
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, adminId: user?.id }),
    });
    setLoading(false);

    if (res.ok) {
      const data = await res.json();
      setSuccessAlertMessage('Invitation sent successfully!');
      setShowSuccessAlert(true);
      setInviteEmail('');
      setInvite(data);
    } else {
      alert('Failed to send invitation.');
    }
  };

  const handleTaskCreate = async (e: any) => {
    e.preventDefault();
    setLoading(true);
     console.log('Attempting to create task from frontend...', newTask);

    // Find the assigned employee's name based on the selected ID
    const assignedEmployee = employees.find(emp => emp.id === newTask.assignedTo);
    const assignedToName = assignedEmployee ? assignedEmployee.name : 'Unassigned';

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTask,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        assignedToName: assignedToName, // Include assignedToName in the request body
      }),
    });
    setLoading(false);
    console.log('Task creation response status:', res.status);
    console.log('Task creation response ok:', res.ok);

    if (res.ok) { // res.ok is true for status codes in the range 200-299
       console.log('Task creation successful.');
      setNewTask({ title: '', description: '', dueDate: '', assignedTo: '' });
      // Re-fetch *all* tasks to update the list accurately
      fetchTasks(); // Call fetchTasks here to refresh the list
      // Show success alert
      setSuccessAlertMessage('Task created successfully!');
      setShowSuccessAlert(true);
    } else {
      // Handle errors, maybe show an error alert later
      console.error('Task creation failed.', res.status);
      alert('Failed to create task.'); // Keep default alert for errors
    }
  };

  const handleReassign = async (taskId: string, assignedTo: string) => {
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo }),
    });
    setLoading(false);
    if (res.ok) {
      // Re-fetch tasks after reassigning to update the list
      fetchTasks(); // Call fetchTasks here to refresh the list
      // Show success alert
      setSuccessAlertMessage('Task reassigned successfully!');
      setShowSuccessAlert(true);
    } else {
      alert('Failed to reassign task.'); // Keep default alert for errors
    }
  };

  const closeSuccessAlert = () => {
    setShowSuccessAlert(false);
    setSuccessAlertMessage('');
  };

  // Display loading state while user is being loaded by useUser
  if (!isLoaded) {
      return <div>Loading user data...</div>;
  }

  // If user is loaded but not an admin, show access denied or redirect (middleware should handle redirect)
  if (!user || user.publicMetadata.plan !== 'enterprise' || user.publicMetadata.role !== 'admin') {
      return (
          <div className="flex min-h-screen items-center justify-center">
              <p className="text-red-500 text-xl">Access Denied: You are not an enterprise admin.</p>
          </div>
      );
  }


  return (
    <div className="space-y-6">
      {/* Back to Dashboard Button */}
      <Link href="/dashboard">
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
          &larr; Back to Dashboard
        </button>
      </Link>

       {/* Render the SuccessAlert component */}
       <SuccessAlert
         message={successAlertMessage}
         isVisible={showSuccessAlert}
         onClose={closeSuccessAlert}
       />

      {/* Invite email form and related display */}
      <div className="mb-6">
         <h2 className="text-xl font-semibold">Send Invitation</h2>
         <form onSubmit={handleSendInvitation} className="flex space-x-2">
             <input
                 type="email"
                 placeholder="Enter recipient email"
                 value={inviteEmail}
                 onChange={e => setInviteEmail(e.target.value)}
                 className="flex-grow border rounded p-2"
                 required
             />
             <button
                 type="submit"
                 className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                 disabled={loading}
             >
                 {loading ? 'Sending...' : 'Send Invitation'}
             </button>
         </form>
        {/* Display invite details if needed (optional based on API response) */}
        {invite && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
            <div>
              <strong>Generated Invite Code (for reference):</strong> <span className="font-mono">{invite.code}</span>
            </div>
             <div>
              <strong>Expires At:</strong> {new Date(invite.expiresAt).toLocaleString()}
            </div>
             {/* You might not display the full link here anymore */}
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold">Enterprise Admin Panel</h1>

      {/* Create & Assign Task Form */}
      <h2 className="text-xl font-semibold mt-6">Create & Assign Task</h2>
      <form onSubmit={handleTaskCreate} className="space-y-2 bg-white p-4 rounded shadow">
        <input
          type="text"
          placeholder="Title"
          value={newTask.title}
          onChange={e => setNewTask({ ...newTask, title: e.target.value })}
          className="block w-full border rounded p-2 mb-2"
          required
        />
        <textarea
          placeholder="Description"
          value={newTask.description}
          onChange={e => setNewTask({ ...newTask, description: e.target.value })}
          className="block w-full border rounded p-2 mb-2"
          required
        />
        <input
          type="date"
          value={newTask.dueDate}
          onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
          className="block w-full border rounded p-2 mb-2"
        />
         {/* Assigned To dropdown */}
        {employees.length > 0 && (
          <select
            value={newTask.assignedTo}
            onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
            className="block w-full border rounded p-2 mb-2"
          >
            <option value="">Assign to...</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        )}

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </form>

      <TaskList isEnterprise={true} employees={employees} showAddTaskButton={true} />
    </div>
  );
}