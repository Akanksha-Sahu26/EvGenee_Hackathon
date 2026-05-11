const Booking = require('../models/booking.model');
const cron = require('node-cron');
const { sendEmail } = require('../services/email.service');
const { NODEMAILER_USER, NODEMAILER_PASS, NODEMAILER_PORT } = require('../config/config');

const initializeCronJobs = (io) => {

    cron.schedule('*/15 * * * *', async () => {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    
            const noShows = await Booking.updateMany(
                {
                    status: 'confirmed',
                    date: { $lte: today },
                    endTime: { $lt: currentTime },
                },
                {
                    $set: { status: 'no-show' },
                }
            );

            if (noShows.modifiedCount > 0) {
                console.log(`[CRON] Marked ${noShows.modifiedCount} bookings as no-show`);
            }
        } catch (error) {
            console.error('[CRON] Error marking no-shows:', error.message);
        }
    });

  
    cron.schedule('*/10 * * * *', async () => {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            const autoCompleted = await Booking.updateMany(
                {
                    status: 'in-progress',
                    date: { $lte: today },
                    endTime: { $lte: currentTime },
                },
                {
                    $set: {
                        status: 'completed',
                        completedAt: now,
                    },
                }
            );

            if (autoCompleted.modifiedCount > 0) {
                console.log(`[CRON] Auto-completed ${autoCompleted.modifiedCount} bookings`);
            
                if (io) {
                    io.emit('bookings:autoCompleted', {
                        count: autoCompleted.modifiedCount,
                        timestamp: now,
                    });
                }
            }
        } catch (error) {
            console.error('[CRON] Error auto-completing bookings:', error.message);
        }
    });

 
    cron.schedule('* * * * *', async () => {
        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

            const expired = await Booking.updateMany(
                {
                    status: 'pending',
                    createdAt: { $lt: tenMinutesAgo },
                },
                {
                    $set: { status: 'cancelled', cancellationReason: 'Auto-cancelled: Booking expired' },
                }
            );

            if (expired.modifiedCount > 0) {
                console.log(`[CRON] Expired ${expired.modifiedCount} pending bookings`);
                if (io) {
                    io.emit('station:capacity_changed', {
                        type: 'expiration',
                        count: expired.modifiedCount,
                        timestamp: new Date(),
                    });
                }
            }
        } catch (error) {
            console.error('[CRON] Error expiring pending bookings:', error.message);
        }
    });

    // Reminder Cron: Run every minute to find bookings starting in 15 minutes
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            const reminderDate = new Date(Date.now() + 15 * 60 * 1000);
            const reminderTimeStr = `${reminderDate.getHours().toString().padStart(2, '0')}:${reminderDate.getMinutes().toString().padStart(2, '0')}`;

            const upcomingBookings = await Booking.find({
                status: 'confirmed',
                date: { $eq: today },
                startTime: reminderTimeStr,
                reminderSent: false
            }).populate('user', 'name email');

            for (const b of upcomingBookings) {
        
                await sendEmail({
                    to: b.user.email,
                    subject: "⚡ Reminder: Your Charging Session starts in 15 mins!",
                    title: "Charging Session Reminder",
                    content: `
                        <p>Hello <b>${b.user.name}</b>,</p>
                        <p>Your EV charging session is scheduled to start at <b>${b.startTime}</b>.</p>
                        <p>Please arrive at the station a few minutes early to ensure a smooth experience.</p>
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #edf2f7;">
                            <p style="margin: 0; color: #64748b; font-size: 13px;">STATUS</p>
                            <p style="margin: 5px 0 15px 0; font-weight: 700; color: #22c55e;">Ready to Charge</p>
                            <p style="margin: 0; color: #64748b; font-size: 13px;">VEHICLE NUMBER</p>
                            <p style="margin: 5px 0 0 0; font-weight: 700;">${b.vehicleNumber || 'N/A'}</p>
                        </div>
                        <p>Happy Charging!<br/><b>Team EvGenee</b></p>
                    `
                });

                // Send Socket Notification
                if (io) {
                    io.to(`user_${b.user._id}`).emit('booking:reminder', {
                        message: `Your charging session starts at ${b.startTime}. Be ready!`,
                        bookingId: b._id
                    });
                }

                b.reminderSent = true;
                await b.save();
                console.log(`[CRON] Reminder sent to ${b.user.email} for booking ${b._id}`);
            }
        } catch (error) {
            console.error('[CRON] Error sending reminders:', error.message);
        }
    });
};

module.exports = { initializeCronJobs };
