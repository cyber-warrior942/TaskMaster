import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { Task } from '@/models/Task';
import connectDB from '@/lib/db';
import { User } from '@/models/User'; // Import User model
import sgMail from '@sendgrid/mail'; // Import sgMail

// Verify SendGrid configuration
console.log('SendGrid Configuration Check:', {
  apiKeyPresent: !!process.env.SENDGRID_API_KEY,
  fromEmailPresent: !!process.env.SENDGRID_FROM_EMAIL,
  fromEmail: process.env.SENDGRID_FROM_EMAIL,
  nodeEnv: process.env.NODE_ENV
});

// Set SendGrid API Key if not already set globally
if (!process.env.SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY is not set in environment variables. Email sending will fail.');
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY!); // Set API key here if not set globally in a setup file

export async function POST(req: Request) {
  try {
    console.log('Attempting to create task...');
    await connectDB();
    console.log('Database connected.');
    const { userId } = auth();
    if (!userId) {
      console.error('Unauthorized: No user ID found.');
      return new NextResponse('Unauthorized', { status: 401 });
    }
    console.log('User authenticated with ID:', userId);
    const taskData = await req.json();
    console.log('Received task data:', taskData);
    const { title, description, dueDate, assignedTo, assignedToName } = taskData; // Include assignedToName
    if (!title) {
      console.error('Error: Task title is required.');
      return new NextResponse('Error: Task title is required.', { status: 400 });
    }
    
    // Fetch the creator's name for the email
    let createdByName = 'Admin'; // Default name
    try {
      const creator = await User.findOne({ id: userId });
      if (creator) {
        createdByName = creator.name;
      } else {
        console.warn(`Creator user with ID ${userId} not found in DB.`);
      }
    } catch (fetchError) {
      console.error('Error fetching creator user for email:', fetchError);
    }

    const newTask = new Task({
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedTo: assignedTo || undefined,
      assignedToName: assignedToName || 'Unassigned', // Save assignedToName
      createdBy: userId,
      createdByName: createdByName, // Save creator's name
      status: 'pending', // Initial status should be pending for a new task
    });
    console.log('New task object created:', newTask);
    await newTask.save();
    console.log('Task saved to database successfully.', newTask);

    // Send email notification if assigned
    if (assignedTo && assignedToName) {
      console.log(`Task assigned to ${assignedToName}. Attempting to send email.`);
      try {
        const assignedUser = await User.findOne({ id: assignedTo });
        if (assignedUser?.email) {
          const assignedEmail = assignedUser.email;
          const taskDueDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A';
          const emailSubject = `New Task Assigned: ${title}`;
          const emailText = `Hello ${assignedToName},

A new task has been assigned to you:

Title: ${title}
Description: ${description}
Due Date: ${taskDueDate}
Assigned By: ${createdByName}

Please log in to the application to view the task details.
`;
          const emailHtml = `<p>Hello ${assignedToName},</p>
<p>A new task has been assigned to you:</p>
<p><strong>Title:</strong> ${title}</p>
<p><strong>Description:</strong> ${description}</p>
<p><strong>Due Date:</strong> ${taskDueDate}</p>
<p><strong>Assigned By:</strong> ${createdByName}</p>
<p>Please log in to the application to view the task details.</p>`;

          console.log(`Sending task assignment email to ${assignedEmail}...`);
          
          // Use sgMail.send directly
          const msg = {
            to: assignedEmail,
            from: {
              email: process.env.SENDGRID_FROM_EMAIL!,
              name: 'Your Task App' // Customize the sender name
            },
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
          };

          console.log('SendGrid Message Configuration:', {
            to: msg.to,
            from: msg.from,
            subject: msg.subject,
            hasText: !!msg.text,
            hasHtml: !!msg.html
          });

          try {
            const response = await sgMail.send(msg);
            console.log('SendGrid Response:', {
              statusCode: response[0]?.statusCode,
              headers: response[0]?.headers,
              body: response[0]?.body
            });
            console.log(`Task assignment email sent successfully to ${assignedEmail} using sgMail.send.`);
          } catch (emailError: any) {
            console.error('Error sending task assignment email with sgMail:', emailError);
            if (emailError.response) {
              console.error('SendGrid Email Error Details:', {
                statusCode: emailError.response.statusCode,
                body: emailError.response.body,
                headers: emailError.response.headers
              });
            }
            // Log the full error object for debugging
            console.error('Full SendGrid Error:', JSON.stringify(emailError, null, 2));
          }

        } else {
          console.warn(`Assigned user with ID ${assignedTo} not found in DB or has no email.`);
        }
      } catch (emailError: any) {
        console.error('Error sending task assignment email with sgMail:', emailError);
         if (emailError.response) {
           console.error('SendGrid Email Error Details:', emailError.response.body);
         }
      }
    } else {
      console.log('Task not assigned, no email notification sent.');
    }

    return NextResponse.json({ message: 'Task created successfully', task: newTask }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
    }
    return new NextResponse('Error creating task', { status: 500 });
  }
}

export async function GET(req: Request) {
  const { userId, sessionClaims } = auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // Corrected access to role from metadata
    const userRole = (sessionClaims as any)?.metadata?.role; 
    console.log(`GET /api/tasks: Fetching tasks for User ID: ${userId} with Role: ${userRole}`);

    let tasks;

    if (userRole === 'admin') {
      // Admins see all tasks
      console.log(`GET /api/tasks: User is admin. Fetching all tasks.`);
      tasks = await Task.find({});
    } else if (userRole === 'member'){
      // Members see tasks assigned to them
      console.log(`GET /api/tasks: User is member. Fetching assigned tasks.`);
      tasks = await Task.find({ assignedTo: userId });
    } else {
       // Fallback for users without a clear role in metadata - check if they created tasks
       const createdTasks = await Task.find({ createdBy: userId });
       if (createdTasks.length > 0) {
         console.log(`GET /api/tasks: User has created tasks. Assuming admin-like view.`);
         tasks = await Task.find({}); // Show all tasks if they've created some
       } else {
         console.log(`GET /api/tasks: User has no role and no created tasks. Assuming member-like view.`);
         tasks = await Task.find({ assignedTo: userId }); // Show only assigned tasks
       }
    }

    console.log(`GET /api/tasks: Found ${tasks.length} tasks for user ${userId}`);
    console.log(`GET /api/tasks: Returning tasks: ${tasks.length > 0 ? tasks.slice(0, 5).map(t => t.title).join(', ') + '...' : '[]'}`);

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ message: "Failed to fetch tasks", error }, { status: 500 });
  }
} 