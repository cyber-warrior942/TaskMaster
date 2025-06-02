import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { Task } from '@/models/Task';
import { User } from '@/models/User';
import connectDB from '@/lib/db';
import { sendEmail } from '@/utils/sendEmail';

interface Params {
  params: {
    taskId: string;
  };
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId, sessionClaims } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { taskId } = params;
    const body = await req.json();

    // Add detailed logging for session claims and public metadata after taskId is defined
    console.log(`PATCH /api/tasks/${taskId}: Raw Session Claims:`, sessionClaims);
    console.log(`PATCH /api/tasks/${taskId}: Public Metadata:`, sessionClaims?.publicMetadata);

    await connectDB();

    const userRole = sessionClaims?.publicMetadata?.role;
    console.log(`PATCH /api/tasks/${taskId}: User ${userId} with role ${userRole} attempting to update task`);

    const task = await Task.findOne({ _id: taskId });
    if (!task) {
      return new NextResponse('Task not found', { status: 404 });
    }

    // Determine if user is admin based on role or task creation
    const isAdmin = userRole === 'admin' || task.createdBy === userId;
    const isAssignedTo = task.assignedTo === userId;

    // Permission check logic:
    // - Admins can update any field of any task
    // - Members can only update the 'status' field of tasks assigned to them
    if (isAdmin) {
      // Admin can update any field
      Object.assign(task, body);
    } else if (isAssignedTo) {
      // Member can only update status
      if (Object.keys(body).length === 1 && 'status' in body) {
        task.status = body.status;
      } else {
        return new NextResponse('Members can only update task status', { status: 403 });
      }
    } else {
      return new NextResponse('Unauthorized to update this task', { status: 403 });
    }

    await task.save();
    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return new NextResponse('Error updating task', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { userId, sessionClaims } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { taskId } = params;
    await connectDB();

    const userRole = sessionClaims?.publicMetadata?.role;
    console.log(`DELETE /api/tasks/${taskId}: User ${userId} with role ${userRole} attempting to delete task`);

    const task = await Task.findOne({ _id: taskId });
    if (!task) {
      return new NextResponse('Task not found', { status: 404 });
    }

    // Only allow deletion if user is admin or created the task
    if (userRole === 'admin' || task.createdBy === userId) {
      await Task.deleteOne({ _id: taskId });
      return new NextResponse('Task deleted successfully', { status: 200 });
    }

    return new NextResponse('Unauthorized to delete this task', { status: 403 });
  } catch (error) {
    console.error('Error deleting task:', error);
    return new NextResponse('Error deleting task', { status: 500 });
  }
} 