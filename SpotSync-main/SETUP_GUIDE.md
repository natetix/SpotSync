# SpotSync Interactive Floorplan Setup Guide

## 🎯 What We've Built

A comprehensive interactive floorplan system that integrates with your existing Firebase setup, featuring:

- **Multi-floor support** (4 floors)
- **Real-time facility status** from Firebase
- **User booking system** with payment processing
- **Admin management tools** for facility control
- **TnG payment integration** with receipt upload

## 📁 File Structure

```
Spot_Sync/
├── public/
│   ├── user-floorplan.html          # User floorplan page
│   ├── admin-floorplan.html         # Admin floorplan page
│   ├── user-dashboard.html          # Updated with floorplan access
│   ├── admin-dashboard.html         # Updated with floorplan access
│   └── js/
│       ├── floorplan-bundle.js      # React components (built)
│       └── admin-dashboard.js       # Updated with facility counting
├── src/
│   ├── floorplan.js                 # Main React entry point
│   └── components/
│       ├── Floorplan.jsx            # Main floorplan component
│       ├── Facility.jsx             # Individual facility component
│       └── Floorplan.css            # Styling
└── package.json                     # Dependencies and build scripts
```

## 🔧 Setup Instructions

### 1. Firebase Configuration

Make sure your `public/js/firebase-config.js` file contains your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Make config available globally for React
window.firebaseConfig = firebaseConfig;
```

### 2. Firebase Collections Setup

Your `facilities` collection should have documents with this structure:

```javascript
// Example document: pool_table_1
{
  name: "Pool Table 1",
  type: "Pool Table",
  floor: 2,
  status: "available",
  requires_payment: true
}

// Example document: cubicle_1
{
  name: "Cubicle 1",
  type: "Cubicle",
  floor: 2,
  status: "available",
  requires_payment: false
}
```

### 3. Required Documents

Create these documents in your `facilities` collection:

**Pool Tables (Floor 2):**

- `pool_table_1` to `pool_table_2` (requires_payment: true)

**Cubicles (Floor 2):**

- `cubicle_1` to `cubicle_16` (requires_payment: false)

**Study Rooms (Floor 2):**

- `study_room_1` to `study_room_6` (requires_payment: false)

**Discussion Rooms (Floor 2):**

- `discussion_room_1` to `discussion_room_5` (requires_payment: false)

### 4. Build the React Components

```bash
npm run build
```

This creates `public/js/floorplan-bundle.js` which contains all the React components.

## 🚀 How to Use

### For Users:

1. Go to `user-dashboard.html`
2. Click "🗺️ Interactive Floorplan"
3. Select a floor from the dropdown
4. Click on available facilities to book
5. For pool tables: Pay RM5 via TnG QR code and upload receipt
6. For other facilities: Booking is confirmed immediately

### For Admins:

1. Go to `admin-dashboard.html`
2. Click "🗺️ Interactive Floorplan" or click on "Total Facilities" card
3. Select a floor from the dropdown
4. Click on any facility to manage it
5. Use admin actions: Remove Participants, Mark Available, Mark In Use

## 💰 Payment System

- **Pool Tables**: RM5/hour, requires TnG payment
- **Other Facilities**: Free, no payment required
- **Payment Flow**:
  1. User books pool table
  2. TnG QR code displayed
  3. User pays via TnG app
  4. User uploads payment receipt
  5. Booking confirmed

## 🔄 Real-time Updates

- Facility status updates in real-time
- Total facilities count updates automatically
- Admin can see all floors and manage all facilities
- Users can only see and book available facilities

## 🛠️ Customization

### Adding New Floors:

1. Update the floor selector in `Floorplan.jsx`
2. Add facility positions in `getFacilityPosition()` function
3. Create corresponding Firebase documents

### Adding New Facility Types:

1. Add icon in `Facility.jsx` `getIcon()` function
2. Add positions in `Floorplan.jsx` `getFacilityPosition()` function
3. Create Firebase documents with appropriate settings

### Changing Payment Amount:

Update the amount calculation in `Floorplan.jsx`:

```javascript
amount: facility.requires_payment ? 5 : 0; // Change 5 to your desired amount
```

## 🐛 Troubleshooting

### Common Issues:

1. **Floorplan not loading**: Check Firebase configuration
2. **Facilities not showing**: Verify Firebase documents exist
3. **Payment not working**: Ensure TnG QR code is properly configured
4. **Build errors**: Run `npm install` and try `npm run build` again

### Debug Mode:

Open browser console to see detailed logs and error messages.

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Verify Firebase configuration
3. Ensure all required documents exist in Firebase
4. Check that `floorplan-bundle.js` was built successfully

## 🎉 What's Next?

- Add more floors (3, 4, etc.)
- Implement user authentication integration
- Add booking history and management
- Enhance payment system with real TnG integration
- Add facility maintenance scheduling
- Implement notifications system
