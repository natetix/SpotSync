// firebase-config.js
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCnNymkFLnwY-_lFpPWsH9x1VjlJB2GKrk",
  authDomain: "spotsync-fb49e.firebaseapp.com",
  projectId: "spotsync-fb49e",
  storageBucket: "spotsync-fb49e.appspot.com",
  messagingSenderId: "366115063619",
  appId: "1:366115063619:web:a8dff4c728328a6b3a51f6",
  measurementId: "G-Z472S0J19Z"
};

// Initialize Firebase using the compat SDK
firebase.initializeApp(firebaseConfig);
window.firebaseConfig = firebaseConfig;

function createBooking(userId, facilityId, startTime, endTime, requiresPayment, paymentReceiptUrl = null) {
  const bookingData = {
    user_id: userId,
    facility_id: facilityId,
    start_time: firebase.firestore.Timestamp.fromDate(new Date(startTime)),
    end_time: firebase.firestore.Timestamp.fromDate(new Date(endTime)),
    status: requiresPayment ? "pending" : "paid",
    check_in_time: null,
    cancellation_reason: null,
    payment_receipt_url: paymentReceiptUrl,
    admin_verified: requiresPayment ? false : true
  };

  // Add to Firestore
  firebase.firestore().collection("bookings").add(bookingData)
    .then((docRef) => {
      console.log("Booking created with ID: ", docRef.id);
      // You can show a success message to the user here
    })
    .catch((error) => {
      console.error("Error adding booking: ", error);
      // Show an error message to the user
    });
}