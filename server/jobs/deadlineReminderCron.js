// jobs/deadlineReminderCron.js
import cron from "node-cron";
import Deadline from "../models/Deadline.js";
import { sendDeadlineReminder } from "../utils/emailService.js";

/**
 * Check and send deadline reminders
 * Runs every day at 9:00 AM
 */
const checkAndSendReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all active deadlines
    const deadlines = await Deadline.find({
      status: { $in: ["ON", "PENDING"] },
      deadline_date: { $gte: today }, // Not expired
    }).populate("docket_id", "docket_no title");

    let sentCount = 0;
    let failedCount = 0;

    for (const deadline of deadlines) {
      // Skip if no emails configured
      if (!deadline.emails || deadline.emails.length === 0) {
        continue;
      }

      // Check each remainder date
      for (let i = 1; i <= 6; i++) {
        const remainderDate = deadline[`remainder${i}`];

        if (remainderDate) {
          const reminderDay = new Date(remainderDate);
          reminderDay.setHours(0, 0, 0, 0);

          // If reminder date matches today, send email
          if (reminderDay.getTime() === today.getTime()) {
            console.log(
              `📧 Sending reminder ${i} for ${deadline.application_no}...`
            );

            const result = await sendDeadlineReminder(deadline, i);

            if (result.success) {
              sentCount++;
            } else {
              failedCount++;
            }

            // Add small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Cron job error:", error);
  }
};

/**
 * Initialize cron job
 * Schedule: Every day at 9:00 AM
 * Cron format: second minute hour day month weekday
 */
export const startReminderCron = () => {
  // Run at 9:00 AM every day
  cron.schedule("0 9 * * *", checkAndSendReminders, {
    timezone: "Asia/Kolkata", // Change to your timezone
  });

  // Optional: Run immediately on startup for testing
  if (process.env.NODE_ENV === "development") {
    checkAndSendReminders();
  }
};

// Export for manual testing
export { checkAndSendReminders };
