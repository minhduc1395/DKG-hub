import { supabase } from '../lib/supabaseClient.ts';
import { format, addDays } from 'date-fns';

export async function checkTaskDeadlines() {
  try {
    const now = new Date();

    const tomorrow = addDays(now, 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    const todayStr = format(now, 'yyyy-MM-dd');

    console.log(`[TaskNotification] Checking for tasks due on ${tomorrowStr} at 4 PM today (${todayStr})`);

    // 1. Fetch tasks due tomorrow that are not done
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, assignee_id, deadline')
      .eq('deadline', tomorrowStr)
      .not('status', 'eq', 'Done');

    if (tasksError) {
      console.error('[TaskNotification] Error fetching tasks:', tasksError);
      return;
    }

    if (!tasks || tasks.length === 0) {
      console.log('[TaskNotification] No tasks due tomorrow.');
      return;
    }

    for (const task of tasks) {
      if (!task.assignee_id) continue;

      // 2. Check if a notification was already sent today for this task to avoid duplicates
      // We use a specific title pattern to identify these notifications
      const notificationTitle = `Deadline Reminder: ${task.title}`;
      
      const { data: existingNotifications, error: checkError } = await supabase
        .from('notifications')
        .select('id')
        .eq('recipient_id', task.assignee_id)
        .eq('title', notificationTitle)
        .gte('created_at', `${todayStr}T00:00:00Z`)
        .lte('created_at', `${todayStr}T23:59:59Z`);

      if (checkError) {
        console.error(`[TaskNotification] Error checking existing notifications for task ${task.id}:`, checkError);
        continue;
      }

      if (existingNotifications && existingNotifications.length > 0) {
        console.log(`[TaskNotification] Notification already sent today for task: ${task.title}`);
        continue;
      }

      // 3. Create the notification
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          recipient_id: task.assignee_id,
          title: notificationTitle,
          content: `Your task "${task.title}" is due tomorrow (${tomorrowStr}). Please ensure it is completed on time.`,
          category: 'task',
          is_read: false
        });

      if (insertError) {
        console.error(`[TaskNotification] Error creating notification for task ${task.id}:`, insertError);
      } else {
        console.log(`[TaskNotification] Sent notification for task: ${task.title} to user: ${task.assignee_id}`);
      }
    }
  } catch (err) {
    console.error('[TaskNotification] Unexpected error:', err);
  }
}

export async function checkReminders() {
  try {
    const now = new Date();
    const nowStr = now.toISOString();

    console.log(`[TaskReminder] Checking for reminders due at ${nowStr}`);

    // 1. Fetch tasks with reminders that are due and not yet sent
    // We'll use a specific notification title to track if a reminder was already sent
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, assignee_id, reminder_at')
      .lte('reminder_at', nowStr)
      .not('status', 'eq', 'Done');

    if (tasksError) {
      console.error('[TaskReminder] Error fetching tasks:', JSON.stringify(tasksError, null, 2));
      if (tasksError.code === '42703') {
        console.error('[TaskReminder] HINT: The "reminder_at" column might be missing from the "tasks" table. Please add it using: ALTER TABLE tasks ADD COLUMN reminder_at TIMESTAMPTZ;');
      }
      return;
    }

    if (!tasks || tasks.length === 0) {
      return;
    }

    for (const task of tasks) {
      if (!task.assignee_id || !task.reminder_at) continue;

      const reminderTitle = `Task Reminder: ${task.title}`;
      
      // 2. Check if this specific reminder was already sent
      // We check for notifications with this title for this user created AFTER the reminder_at time
      const { data: existingNotifications, error: checkError } = await supabase
        .from('notifications')
        .select('id')
        .eq('recipient_id', task.assignee_id)
        .eq('title', reminderTitle)
        .gte('created_at', task.reminder_at);

      if (checkError) {
        console.error(`[TaskReminder] Error checking existing notifications for task ${task.id}:`, checkError);
        continue;
      }

      if (existingNotifications && existingNotifications.length > 0) {
        continue;
      }

      // 3. Create the notification
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          recipient_id: task.assignee_id,
          title: reminderTitle,
          content: `Reminder for your task: "${task.title}".`,
          category: 'task',
          is_read: false
        });

      if (insertError) {
        console.error(`[TaskReminder] Error creating notification for task ${task.id}:`, insertError);
      } else {
        console.log(`[TaskReminder] Sent reminder for task: ${task.title} to user: ${task.assignee_id}`);
      }
    }
  } catch (err) {
    console.error('[TaskReminder] Unexpected error:', err);
  }
}
