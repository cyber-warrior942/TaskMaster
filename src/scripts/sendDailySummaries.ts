import { connect } from 'mongoose';
import { Task } from '@/models/Task';
import { User } from '@/models/User';
import { sendEmail } from '@/utils/sendEmail';
import dotenv from 'dotenv';

dotenv.config();

async function sendDailySummaries() {
  await connect(process.env.MONGODB_URI!);

  // Find all users
  const users = await User.find({});

  for (const user of users) {
    // Find pending tasks due today or earlier
    const pendingTasks = await Task.find({
      assignedTo: user.id,
      status: 'pending',
      dueDate: { $lte: new Date() },
    });
    if (pendingTasks.length > 0) {
      const taskList = pendingTasks.map(t => `<li>${t.title} (Due: ${t.dueDate.toDateString()})</li>`).join('');
      await sendEmail({
        to: user.email,
        subject: 'Daily Task Summary',
        html: `<p>You have the following pending tasks:</p><ul>${taskList}</ul>`
      });
      console.log(`Sent summary to ${user.email}`);
    }
  }
  process.exit(0);
}

sendDailySummaries().catch(err => {
  console.error('Error sending daily summaries:', err);
  process.exit(1);
}); 