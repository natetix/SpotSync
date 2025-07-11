import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, collection as firestoreCollection } from 'firebase/firestore';
import Facility from './Facility';
import './Floorplan.css';

// Initialize Firebase using the existing config
// This will use the firebase-config.js file that's already loaded in the HTML
const app = initializeApp(window.firebaseConfig || {
  // Fallback config - replace with your actual Firebase config
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
});

const db = getFirestore(app);

const FLOOR_CONFIG = [
  { floor: 2, label: 'Floor 2 (Pool Tables)', type: 'Pool Table' },
  { floor: 3, label: 'Floor 3 (Cubicles)', type: 'Cubicle' },
  { floor: 4, label: 'Floor 4 (Study Rooms)', type: 'Study Room' },
  { floor: 6, label: 'Floor 6 (Discussion Rooms)', type: 'Discussion Room' },
];

const Floorplan = ({ userType = 'user', currentFloor = 2 }) => {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [floor, setFloor] = useState(currentFloor);

  // Load facilities from Firebase
  useEffect(() => {
    loadFacilities();
  }, [floor]);

  const loadFacilities = async () => {
    try {
      setLoading(true);
      const facilitiesRef = collection(db, 'facilities');
      const snapshot = await getDocs(facilitiesRef);
      const facilitiesData = [];
      const floorConfig = FLOOR_CONFIG.find(f => f.floor === floor);
      console.log('Selected floor:', floor, 'Expected type:', floorConfig.type);
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Loaded doc:', data);
        // Only pool tables should require payment
        let requiresPayment = false;
        if (data.type && data.type.trim().toLowerCase() === 'pool table') {
          requiresPayment = true;
        } else if (data.requires_payment) {
          console.warn('Non-pool-table facility has requires_payment=true:', data);
        }
        // Case-insensitive, trimmed type comparison
        if (
          data.floor === floor &&
          data.type &&
          data.type.trim().toLowerCase() === floorConfig.type.trim().toLowerCase()
        ) {
          facilitiesData.push({
            id: doc.id,
            ...data,
            requires_payment: requiresPayment,
            position: getFacilityPosition(doc.id, data.type)
          });
        }
      });
      console.log('Facilities for this floor:', facilitiesData);
      setFacilities(facilitiesData);
    } catch (error) {
      console.error('Error loading facilities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Position mapping for facilities on the floorplan
  const getFacilityPosition = (id, type) => {
    const positions = {
      'pool_table': {
        'pool_table_1': { x: 50, y: 100 },
        'pool_table_2': { x: 200, y: 100 }
      },
      'cubicle': {
        'cubicle_1': { x: 50, y: 200 },
        'cubicle_2': { x: 150, y: 200 },
        'cubicle_3': { x: 250, y: 200 },
        'cubicle_4': { x: 350, y: 200 },
        'cubicle_5': { x: 50, y: 300 },
        'cubicle_6': { x: 150, y: 300 },
        'cubicle_7': { x: 250, y: 300 },
        'cubicle_8': { x: 350, y: 300 },
        'cubicle_9': { x: 450, y: 200 },
        'cubicle_10': { x: 550, y: 200 },
        'cubicle_11': { x: 650, y: 200 },
        'cubicle_12': { x: 750, y: 200 },
        'cubicle_13': { x: 450, y: 300 },
        'cubicle_14': { x: 550, y: 300 },
        'cubicle_15': { x: 650, y: 300 },
        'cubicle_16': { x: 750, y: 300 }
      },
      'study_room': {
        'study_room_1': { x: 50, y: 400 },
        'study_room_2': { x: 200, y: 400 },
        'study_room_3': { x: 350, y: 400 },
        'study_room_4': { x: 500, y: 400 },
        'study_room_5': { x: 650, y: 400 },
        'study_room_6': { x: 800, y: 400 }
      },
      'discussion_room': {
        'discussion_room_1': { x: 50, y: 500 },
        'discussion_room_2': { x: 200, y: 500 },
        'discussion_room_3': { x: 350, y: 500 },
        'discussion_room_4': { x: 500, y: 500 },
        'discussion_room_5': { x: 650, y: 500 }
      }
    };

    const typeKey = type.toLowerCase().replace(' ', '_');
    return positions[typeKey]?.[id] || { x: 100, y: 100 };
  };

  const handleFacilityClick = (facility) => {
    if (userType === 'admin') {
      // Admin can view and manage all facilities
      setSelectedFacility(facility);
      setShowBookingModal(true);
    } else {
      // Users can only book available facilities
      if (facility.status === 'available') {
        setSelectedFacility(facility);
        setShowBookingModal(true);
      } else {
        alert(`${facility.name} is currently ${facility.status}. Please try another facility.`);
      }
    }
  };

  const handleBooking = async (facilityId, timeSlot) => {
    try {
      const facility = facilities.find(f => f.id === facilityId);
      // Only pool tables require payment
      const isPoolTable = facility.type && facility.type.trim().toLowerCase() === 'pool table';
      // Create booking record
      const bookingData = {
        facilityId,
        facilityName: facility.name,
        facilityType: facility.type,
        floor: facility.floor,
        timeSlot,
        status: 'processing',
        userId: getCurrentUserId(), // You'll need to implement this
        userEmail: getCurrentUserEmail(), // You'll need to implement this
        bookingDate: new Date().toISOString(),
        requiresPayment: isPoolTable,
        amount: isPoolTable ? 5 : 0
      };

      // Add booking to Firestore
      const bookingRef = await addDoc(firestoreCollection(db, 'bookings'), bookingData);
      
      // Update facility status
      const facilityRef = doc(db, 'facilities', facilityId);
      await updateDoc(facilityRef, {
        status: 'reserved'
      });

      // Update local state
      setFacilities(prev => 
        prev.map(f => 
          f.id === facilityId 
            ? { ...f, status: 'reserved' }
            : f
        )
      );

      setCurrentBooking({ ...bookingData, id: bookingRef.id });
      setShowBookingModal(false);
      
      if (isPoolTable) {
        setShowPaymentModal(true);
      } else {
        alert('Booking successful!');
      }
      
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Booking failed. Please try again.');
    }
  };

  const handlePaymentUpload = async (receiptFile) => {
    try {
      // Update booking status to 'paid'
      const bookingRef = doc(db, 'bookings', currentBooking.id);
      await updateDoc(bookingRef, {
        status: 'paid',
        paymentReceipt: receiptFile.name, // In production, upload to Firebase Storage
        paymentDate: new Date().toISOString()
      });

      setShowPaymentModal(false);
      setCurrentBooking(null);
      alert('Payment proof uploaded successfully! Your booking is confirmed.');
      
    } catch (error) {
      console.error('Payment upload failed:', error);
      alert('Payment upload failed. Please try again.');
    }
  };

  const handleAdminAction = async (facilityId, action) => {
    try {
      const facilityRef = doc(db, 'facilities', facilityId);
      
      switch (action) {
        case 'remove_participants':
          await updateDoc(facilityRef, { status: 'available' });
          break;
        case 'mark_available':
          await updateDoc(facilityRef, { status: 'available' });
          break;
        case 'mark_in_use':
          await updateDoc(facilityRef, { status: 'in-use' });
          break;
        case 'mark_reserved':
          await updateDoc(facilityRef, { status: 'reserved' });
          break;
      }

      // Refresh facilities
      await loadFacilities();
      setShowBookingModal(false);
      alert('Facility status updated successfully!');
      
    } catch (error) {
      console.error('Admin action failed:', error);
      alert('Action failed. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'in-use': return '#FF9800';
      case 'reserved': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getCurrentUserId = () => {
    // Implement based on your authentication system
    return 'user123'; // Placeholder
  };

  const getCurrentUserEmail = () => {
    // Implement based on your authentication system
    return 'user@example.com'; // Placeholder
  };

  if (loading) {
    return (
      <div className="floorplan-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Loading floorplan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="floorplan-container">
      <div className="floorplan-header">
        <h2>{FLOOR_CONFIG.find(f => f.floor === floor)?.label || `Floor ${floor}`}</h2>
        <div className="floor-controls">
          <select value={floor} onChange={(e) => setFloor(Number(e.target.value))}>
            {FLOOR_CONFIG.map(f => (
              <option key={f.floor} value={f.floor}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="legend">
          <div className="legend-item">
            <div className="legend-dot available"></div>
            <span>Available</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot in-use"></div>
            <span>In Use</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot reserved"></div>
            <span>Reserved</span>
          </div>
        </div>
      </div>
      
      <div className="floorplan">
        {facilities.map(facility => (
          <Facility
            key={facility.id}
            facility={facility}
            onClick={() => handleFacilityClick(facility)}
            statusColor={getStatusColor(facility.status)}
            userType={userType}
          />
        ))}
      </div>

      {showBookingModal && selectedFacility && (
        <BookingModal
          facility={selectedFacility}
          onClose={() => setShowBookingModal(false)}
          onBook={handleBooking}
          onAdminAction={handleAdminAction}
          userType={userType}
        />
      )}

      {showPaymentModal && currentBooking && (
        <PaymentModal
          booking={currentBooking}
          onClose={() => setShowPaymentModal(false)}
          onUpload={handlePaymentUpload}
        />
      )}
    </div>
  );
};

const BookingModal = ({ facility, onClose, onBook, onAdminAction, userType }) => {
  const [selectedTime, setSelectedTime] = useState('1:00 PM - 2:00 PM');
  
  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '1:00 PM - 2:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM'
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>{userType === 'admin' ? 'Manage' : 'Book'} {facility.name}</h3>
        <p>Type: {facility.type}</p>
        <p>Floor: {facility.floor}</p>
        <p>Status: {facility.status}</p>
        {facility.requires_payment && <p>Price: RM5/hour</p>}
        
        {userType === 'user' && facility.status === 'available' && (
          <div className="time-selection">
            <label>Select Time Slot:</label>
            <select 
              value={selectedTime} 
              onChange={(e) => setSelectedTime(e.target.value)}
            >
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          
          {userType === 'admin' ? (
            <>
              <button 
                className="btn-admin" 
                onClick={() => onAdminAction(facility.id, 'remove_participants')}
              >
                Remove Participants
              </button>
              <button 
                className="btn-admin" 
                onClick={() => onAdminAction(facility.id, 'mark_available')}
              >
                Mark Available
              </button>
              <button 
                className="btn-admin" 
                onClick={() => onAdminAction(facility.id, 'mark_in_use')}
              >
                Mark In Use
              </button>
            </>
          ) : (
            <button 
              className="btn-book" 
              onClick={() => onBook(facility.id, selectedTime)}
              disabled={facility.status !== 'available'}
            >
              Book Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ booking, onClose, onUpload }) => {
  const [receiptFile, setReceiptFile] = useState(null);

  const handleFileChange = (e) => {
    setReceiptFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (receiptFile) {
      onUpload(receiptFile);
    } else {
      alert('Please select a receipt file.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Payment Required</h3>
        <p>Amount: RM{booking.amount}</p>
        <p>Facility: {booking.facilityName}</p>
        <p>Time: {booking.timeSlot}</p>
        
        <div className="payment-qr">
          <h4>Scan QR Code to Pay</h4>
          <div className="qr-placeholder">
            {/* Replace with actual TnG QR code */}
            <div style={{ 
              width: '200px', 
              height: '200px', 
              background: '#f0f0f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '20px auto',
              border: '2px dashed #ccc'
            }}>
              TnG QR Code
            </div>
          </div>
        </div>
        
        <div className="receipt-upload">
          <label>Upload Payment Receipt:</label>
          <input 
            type="file" 
            accept="image/*,.pdf" 
            onChange={handleFileChange}
          />
        </div>
        
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button 
            className="btn-book" 
            onClick={handleUpload}
            disabled={!receiptFile}
          >
            Upload Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default Floorplan; 