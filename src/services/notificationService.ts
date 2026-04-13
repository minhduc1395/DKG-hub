import { supabase } from '../lib/supabaseClient';

export type NotificationCategory = 'task' | 'system' | 'news' | 'advance' | 'payslip';

export async function sendNotification(
  recipientId: string | null,
  title: string,
  content: string,
  category: NotificationCategory = 'system'
) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: recipientId,
        title,
        content,
        category,
        is_read: false
      });

    if (error) {
      console.error('Error sending notification:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error sending notification:', err);
    return { success: false, error: err };
  }
}

export async function notifyAccountants(title: string, content: string, category: NotificationCategory = 'advance') {
  try {
    // Fetch all accountants
    const { data: accountants, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'accountant');

    if (error) throw error;

    if (accountants) {
      const notifications = accountants.map(acc => ({
        recipient_id: acc.id,
        title,
        content,
        category,
        is_read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;
    }
    return { success: true };
  } catch (err) {
    console.error('Error notifying accountants:', err);
    return { success: false, error: err };
  }
}

export async function notifyBOD(title: string, content: string, category: NotificationCategory = 'advance') {
  try {
    // Fetch all BOD members
    // In this app, BOD members might be identified by role 'bod' or position 'CEO', 'Chairman', 'BOD'
    const { data: bodMembers, error } = await supabase
      .from('profiles')
      .select('id')
      .or('role.eq.bod,position.ilike.CEO,position.ilike.Chairman,position.ilike.BOD');

    if (error) throw error;

    if (bodMembers) {
      const notifications = bodMembers.map(bod => ({
        recipient_id: bod.id,
        title,
        content,
        category,
        is_read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;
    }
    return { success: true };
  } catch (err) {
    console.error('Error notifying BOD:', err);
    return { success: false, error: err };
  }
}
