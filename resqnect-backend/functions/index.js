const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendApprovalNotification = functions.firestore
  .document('residents/{residentId}')
  .onUpdate((change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== 'approved' && after.status === 'approved') {
      const token = after.token;

      if (!token) {
        console.log('No FCM token found.');
        return null;
      }

      const message = {
        notification: {
          title: 'Approval Status',
          body: 'Your registration has been approved!',
        },
        token: token,
      };

      return admin.messaging().send(message)
        .then(response => {
          console.log('Notification sent:', response);
          return null;
        })
        .catch(error => {
          console.error('Error sending notification:', error);
        });
    }

    return null;
  });
