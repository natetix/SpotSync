// Plain JS Interactive Floorplan for SpotSync
// Assumes Firebase is already initialized via firebase-config.js

document.addEventListener('DOMContentLoaded', function() {
    const floorplanContainer = document.getElementById('floorplan-container');
    const floors = [
        { floor: 2, label: 'Floor 2 (Pool Tables)', type: 'Pool Table' },
        { floor: 3, label: 'Floor 3 (Cubicles)', type: 'Cubicle' },
        { floor: 4, label: 'Floor 4 (Study Rooms)', type: 'Study Room' },
        { floor: 6, label: 'Floor 6 (Discussion Rooms)', type: 'Discussion Room' }
    ];
    let currentFloor = 2;
    let facilities = [];

    // Add global state for selected date and time slot
    let selectedDate = new Date().toISOString().split('T')[0];
    let selectedTimeSlot = '08:00';
    const timeSlots = [
        '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
    ];

    function formatDateDisplay(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    function renderDateTimeSelectors() {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '10px';
        wrapper.style.margin = '24px 0 0 0';

        // Date row
        const dateRow = document.createElement('div');
        dateRow.style.display = 'flex';
        dateRow.style.alignItems = 'center';
        dateRow.style.gap = '10px';
        dateRow.style.marginBottom = '8px';

        const goToDateBtn = document.createElement('button');
        goToDateBtn.textContent = 'Go To Date';
        goToDateBtn.className = 'btn btn-secondary';
        goToDateBtn.onclick = function() {
            const picker = document.createElement('input');
            picker.type = 'date';
            picker.value = selectedDate;
            picker.min = new Date().toISOString().split('T')[0];
            picker.onchange = function() {
                selectedDate = this.value;
                loadFacilities();
                picker.remove();
            };
            picker.style.position = 'absolute';
            picker.style.left = '-9999px';
            document.body.appendChild(picker);
            picker.focus();
            picker.click();
        };
        dateRow.appendChild(goToDateBtn);

        const prevBtn = document.createElement('button');
        prevBtn.textContent = '<';
        prevBtn.className = 'btn btn-secondary';
        prevBtn.onclick = function() {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            selectedDate = d.toISOString().split('T')[0];
            loadFacilities();
        };
        dateRow.appendChild(prevBtn);

        const dateDisplay = document.createElement('div');
        dateDisplay.textContent = formatDateDisplay(selectedDate);
        dateDisplay.style.fontWeight = '600';
        dateDisplay.style.fontSize = '20px';
        dateRow.appendChild(dateDisplay);

        const nextBtn = document.createElement('button');
        nextBtn.textContent = '>';
        nextBtn.className = 'btn btn-secondary';
        nextBtn.onclick = function() {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            selectedDate = d.toISOString().split('T')[0];
            loadFacilities();
        };
        dateRow.appendChild(nextBtn);

        wrapper.appendChild(dateRow);

        // Time slot row
        const timeRow = document.createElement('div');
        timeRow.style.display = 'flex';
        timeRow.style.gap = '8px';
        timeRow.style.margin = '10px 0 0 0';
        timeRow.style.overflowX = 'auto';
        timeRow.style.padding = '6px 0';
        timeSlots.forEach(slot => {
            const btn = document.createElement('button');
            btn.textContent = slot;
            btn.className = 'btn';
            btn.style.background = selectedTimeSlot === slot ? '#2563eb' : '#f1f5f9';
            btn.style.color = selectedTimeSlot === slot ? '#fff' : '#222';
            btn.style.fontWeight = '600';
            btn.style.borderRadius = '8px';
            btn.style.padding = '8px 18px';
            btn.onclick = function() {
                selectedTimeSlot = slot;
                loadFacilities();
            };
            timeRow.appendChild(btn);
        });
        wrapper.appendChild(timeRow);
        return wrapper;
    }

    function renderFloorSelector() {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        wrapper.style.gap = '18px';
        wrapper.style.margin = '24px 0 0 0';
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '<';
        prevBtn.className = 'btn btn-secondary';
        prevBtn.onclick = function() {
            const idx = floors.findIndex(f => f.floor === currentFloor);
            if (idx > 0) {
                currentFloor = floors[idx - 1].floor;
                loadFacilities();
            }
        };
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '>';
        nextBtn.className = 'btn btn-secondary';
        nextBtn.onclick = function() {
            const idx = floors.findIndex(f => f.floor === currentFloor);
            if (idx < floors.length - 1) {
                currentFloor = floors[idx + 1].floor;
                loadFacilities();
            }
        };
        const label = document.createElement('div');
        label.textContent = floors.find(f => f.floor === currentFloor)?.label || `Floor ${currentFloor}`;
        label.style.fontWeight = '700';
        label.style.fontSize = '2rem';
        label.style.color = '#2563eb';
        label.style.margin = '0 18px';
        wrapper.appendChild(prevBtn);
        wrapper.appendChild(label);
        wrapper.appendChild(nextBtn);
        return wrapper;
    }

    function renderLegend() {
        const legend = document.createElement('div');
        legend.style.margin = '16px 0';
        legend.style.background = '#fff';
        legend.style.borderRadius = '10px';
        legend.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
        legend.style.padding = '10px 18px';
        legend.style.display = 'inline-block';
        legend.style.float = 'right';
        legend.style.marginRight = '40px';
        legend.innerHTML = `
            <span style="color:#4CAF50;font-weight:600;">●</span> Available
            <span style="color:#F44336;font-weight:600;margin-left:16px;">●</span> Reserved
            <span style="color:#FF9800;font-weight:600;margin-left:16px;">●</span> In Use
        `;
        return legend;
    }

    function getFloorBackground(floor) {
        switch (floor) {
            case 2: return 'assets/level 2 pool table.png';
            case 3: return 'assets/level 3 cubicles.png';
            case 4: return 'assets/level 4 cubicles.png';
            case 6: return 'assets/level 6 Discussion Room.png';
            default: return '';
        }
    }

    // Update facility positions for Level 2 to match mockup, with custom size
    const facilityPositions = {
        2: {
            'pool_table_1': { x: 260, y: 185, width: 140, height: 90 },
            'pool_table_2': { x: 400, y: 260, width: 140, height: 90 }
        },
        3: {
            'cubicle_1': { x: 148, y: 123, width: 65, height: 58 },
            'cubicle_2': { x: 148, y: 195, width: 65, height: 58 },
            'cubicle_3': { x: 148, y: 267, width: 65, height: 58 },
            'cubicle_4': { x: 233, y: 123, width: 65, height: 58 },
            'cubicle_5': { x: 233, y: 195, width: 65, height: 58 },
            'cubicle_6': { x: 233, y: 267, width: 65, height: 58 },
            'cubicle_7': { x: 400, y: 123, width: 65, height: 58 },
            'cubicle_8': { x: 400, y: 195, width: 65, height: 58 },
            'cubicle_9': { x: 400, y: 267, width: 65, height: 58 },
            'cubicle_10': { x: 483, y: 123, width: 65, height: 58 },
            'cubicle_11': { x: 483, y: 195, width: 65, height: 58 },
            'cubicle_12': { x: 483, y: 267, width: 65, height: 58 }
        },
        4: {
            'study_room_1': { x: 115, y: 100, width: 180, height: 70 },
            'study_room_2': { x: 115, y: 185, width: 180, height: 70 },
            'study_room_3': { x: 115, y: 270, width: 180, height: 70 },
            'study_room_4': { x: 410, y: 100, width: 180, height: 70 },
            'study_room_5': { x: 410, y: 185, width: 180, height: 70 },
            'study_room_6': { x: 410, y: 270, width: 180, height: 70 }
        },
        6: {
            'discussion_room_1': { x: 15, y: 150, width: 150, height: 110 },
            'discussion_room_2': { x: 15, y: 300, width: 150, height: 110 },
            'discussion_room_3': { x: 535, y: 65, width: 150, height: 110 },
            'discussion_room_4': { x: 535, y: 185, width: 150, height: 110 },
            'discussion_room_5': { x: 535, y: 305, width: 150, height: 110 }
        }
    };

    function renderFacilities() {
        const area = document.createElement('div');
        area.style.position = 'relative';
        area.style.width = '700px';
        area.style.height = '500px';
        area.style.margin = '24px auto 0 auto';
        area.style.background = '#e6ecf5';
        area.style.borderRadius = '18px';
        area.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)';
        // Set background image for the floor
        const bg = getFloorBackground(currentFloor);
        if (bg) {
            area.style.backgroundImage = `url('${bg}')`;
            area.style.backgroundSize = 'contain';
            area.style.backgroundRepeat = 'no-repeat';
            area.style.backgroundPosition = 'center';
        }
        if (facilities.length === 0) {
            area.innerHTML = '<div style="color:#64748b;font-size:18px;">No facilities found for this floor.</div>';
            return area;
        }
        facilities.forEach(fac => {
            const pos = facilityPositions[currentFloor]?.[fac.id] || { x: 50, y: 50 };
            const card = document.createElement('div');
            card.className = 'facility-card';
            card.style.position = 'absolute';
            card.style.left = (pos.x || 0) + 'px';
            card.style.top = (pos.y || 0) + 'px';
            card.style.width = (pos.width || 140) + 'px';
            card.style.height = (pos.height || 80) + 'px';
            card.style.border = '2px solid ' + getStatusColor(fac.status);
            card.style.background = fac.status === 'available' ? '#f1f8e9' : (fac.status === 'in-use' ? '#fff3e0' : '#ffebee');
            card.style.borderRadius = '16px';
            card.style.padding = '0';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'center';
            card.style.justifyContent = 'center';
            card.style.textAlign = 'center';
            card.style.cursor = fac.status === 'available' ? 'pointer' : 'not-allowed';
            card.style.opacity = fac.status === 'available' ? '1' : '0.7';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            // Only show name for cubicles, study rooms, and discussion rooms
            if ((fac.type||'').toLowerCase().includes('cubicle') || (fac.type||'').toLowerCase().includes('study room') || (fac.type||'').toLowerCase().includes('discussion room')) {
                card.innerHTML = `<div style=\"font-size:18px;font-weight:600;\">${fac.name}</div>`;
            } else if ((fac.type||'').toLowerCase().includes('pool table')) {
                card.innerHTML = `<div style=\"font-size:18px;font-weight:600;\">${fac.name}</div><div style=\"color:#4CAF50;font-size:13px;\">RM5/hr</div>`;
            } else {
                card.innerHTML = `
                    <div style=\"font-size:18px;font-weight:600;margin-bottom:4px;\">${fac.name}</div>
                    <div style=\"font-size:13px;color:#64748b;\">${fac.type}</div>
                    <div style=\"font-size:13px;color:#64748b;\">Status: ${capitalize(fac.status)}</div>
                    ${fac.requires_payment ? '<div style=\"color:#4CAF50;font-size:13px;\">RM5/hr</div>' : ''}
                `;
            }
            if (fac.status === 'available') {
                card.onclick = () => showBookingModal(fac);
            }
            area.appendChild(card);
        });
        return area;
    }

    function getStatusColor(status) {
        switch ((status||'').toLowerCase()) {
            case 'available': return '#4CAF50';
            case 'in-use': return '#FF9800';
            case 'reserved': return '#F44336';
            default: return '#9E9E9E';
        }
    }
    function getFacilityIcon(type) {
        switch ((type||'').toLowerCase()) {
            case 'pool table': return '🎱';
            case 'cubicle': return '📚';
            case 'study room': return '🏢';
            case 'discussion room': return '👥';
            default: return '📍';
        }
    }
    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function render() {
        floorplanContainer.innerHTML = '';
        floorplanContainer.appendChild(renderDateTimeSelectors());
        floorplanContainer.appendChild(renderFloorSelector());
        floorplanContainer.appendChild(renderLegend());
        floorplanContainer.appendChild(renderFacilities());
    }

    async function loadFacilities() {
        const floorConfig = floors.find(f => f.floor === currentFloor);
        // First, get all facilities for the floor
        const snapshot = await firebase.firestore().collection('facilities')
            .where('floor', '==', currentFloor)
            .get();
        facilities = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Robust type match
            if ((data.type||'').trim().toLowerCase() === floorConfig.type.trim().toLowerCase()) {
                facilities.push({
                    id: doc.id,
                    ...data,
                    requires_payment: (data.type||'').trim().toLowerCase() === 'pool table',
                    status: 'available' // default, will update below
                });
            }
        });
        if (facilities.length === 0) return render();
        // For each facility, read the status from the availability subcollection for the selected date and time
        await Promise.all(facilities.map(async fac => {
            // Always use the start time as the key
            const slotStart = selectedTimeSlot.split(' - ')[0];
            const availabilityRef = firebase.firestore()
                .collection('facilities')
                .doc(fac.id)
                .collection('availability')
                .doc(selectedDate);
            const doc = await availabilityRef.get();
            if (doc.exists) {
                fac.status = doc.data()[slotStart] || 'available';
                console.log(`[loadFacilities] Facility: ${fac.name}, Slot: ${slotStart}, Status: ${fac.status}`);
            } else {
                fac.status = 'available';
                console.log(`[loadFacilities] Facility: ${fac.name}, Slot: ${slotStart}, Status: (no doc, default to available)`);
            }
        }));
        render();
    }

    function parseTime(str) {
        if (!str || typeof str !== 'string') return 0; // fallback to 0 if invalid
        str = str.trim();
        if (str.includes(':')) {
            // 24-hour or 12-hour format
            const [time, ampm] = str.split(' ');
            let [h, m] = time.split(':').map(Number);
            if (ampm === 'PM' && h !== 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return h * 60 + (m || 0);
        } else {
            // fallback for hour only
            let h = Number(str);
            return isNaN(h) ? 0 : h * 60;
        }
    }

    // Utility to ensure availability doc exists for a facility/date and initialize all timeslots to 'available'
    async function ensureAvailabilityDoc(facilityId, date) {
        const allSlots = [
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00'
        ];
        const availabilityRef = firebase.firestore()
            .collection('facilities')
            .doc(facilityId)
            .collection('availability')
            .doc(date);
        const doc = await availabilityRef.get();
        if (!doc.exists) {
            const slots = {};
            allSlots.forEach(slot => { slots[slot] = 'available'; });
            await availabilityRef.set(slots);
        }
    }

    function showBookingModal(facility) {
        // Modal overlay
        let modal = document.getElementById('bookingModal');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'bookingModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.35)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        // Modal content
        modal.innerHTML = `
          <div style="background: #fff; border-radius: 16px; padding: 36px 32px; min-width: 350px; max-width: 95vw; box-shadow: 0 8px 32px rgba(0,0,0,0.18); position: relative; width: 400px;">
            <button id="closeBookingModal" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;">&times;</button>
            <h2 style="margin-bottom: 8px; color: #4f46e5;">Book ${facility.name}</h2>
            <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
              <div><b>Date:</b> ${formatDateDisplay(selectedDate)}</div>
              <div><b>Facility:</b> ${facility.name}</div>
            </div>
            <form id="bookingForm">
              <div style="margin-bottom:12px;">
                <label for="bookingTime">Select Time Slot:</label>
                <select id="bookingTime" name="bookingTime" required style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;">
                  <option value="">Choose a time slot</option>
                </select>
              </div>
              <div id="bookingError" style="color:#e53e3e;margin-bottom:10px;display:none;"></div>
              <div style="display:flex;gap:12px;justify-content:flex-end;">
                <button type="button" class="btn btn-secondary" id="cancelBookingBtn">Cancel</button>
                <button type="submit" class="btn btn-primary">Book Now</button>
              </div>
            </form>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('closeBookingModal').onclick = () => modal.remove();
        document.getElementById('cancelBookingBtn').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        // Ensure availability doc exists for this facility/date before fetching bookings
        ensureAvailabilityDoc(facility.id, selectedDate).then(() => {
            // Fetch bookings for this facility and date, then populate time slots
            const form = document.getElementById('bookingForm');
            const errorDiv = document.getElementById('bookingError');
            const timeSelect = document.getElementById('bookingTime');
            // List of all possible time slots (1 hour each)
            const allSlots = [
                '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
                '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00',
                '16:00 - 17:00', '17:00 - 18:00'
            ];
            // Fetch bookings for this facility and date
            firebase.firestore().collection('bookings')
                .where('facility_id', '==', facility.id)
                .get()
                .then(snapshot => {
                    const bookedSlots = [];
                    snapshot.forEach(doc => {
                        const b = doc.data();
                        // Check if booking is for the selected date
                        if (b.time_slot && b.time_slot.startsWith(selectedDate)) {
                            // Extract slot (e.g., '08:00 - 09:00')
                            const slot = b.time_slot.slice(11).trim();
                            bookedSlots.push(slot);
                        }
                    });
                    // Populate the select with available/unavailable slots
                    const now = new Date();
                    const isToday = selectedDate === now.toISOString().split('T')[0];
                    allSlots.forEach(slot => {
                        const opt = document.createElement('option');
                        opt.value = slot;
                        let disable = false;
                        if (isToday) {
                            // slot = "13:00 - 14:00"
                            const slotStart = slot.split(' - ')[0];
                            const [h, m] = slotStart.split(':').map(Number);
                            const slotMinutes = h * 60 + m;
                            const nowMinutes = now.getHours() * 60 + now.getMinutes();
                            if (slotMinutes <= nowMinutes) {
                                disable = true;
                            }
                        }
                        if (bookedSlots.includes(slot)) {
                            opt.textContent = `${slot} (Unavailable)`;
                            opt.disabled = true;
                            opt.style.background = '#fee2e2';
                            opt.style.color = '#dc2626';
                        } else if (disable) {
                            opt.textContent = `${slot} (Past)`;
                            opt.disabled = true;
                            opt.style.background = '#eee';
                            opt.style.color = '#888';
                        } else {
                            opt.textContent = slot;
                        }
                        timeSelect.appendChild(opt);
                    });
                });

            // Booking form logic
            form.onsubmit = function(e) {
                e.preventDefault();
                errorDiv.style.display = 'none';
                const bookingTime = form.bookingTime.value;
                if (!selectedDate || !bookingTime) {
                    errorDiv.textContent = 'Please select a time slot.';
                    errorDiv.style.display = 'block';
                    return;
                }
                // If facility is a pool table, show payment modal first
                if ((facility.type || '').toLowerCase() === 'pool table') {
                    showPaymentModal(facility, selectedDate, bookingTime, function() {
                        // After payment, proceed with booking
                        firebase.auth().onAuthStateChanged(function(user) {
                            if (!user) {
                                errorDiv.textContent = 'You must be logged in to book.';
                                errorDiv.style.display = 'block';
                                return;
                            }
                            const bookingData = {
                                user_id: user.uid,
                                user_name: user.displayName || '',
                                user_email: user.email || '',
                                facility_id: facility.id,
                                facility_name: facility.name,
                                facilityType: facility.type, // use camelCase consistently
                                floor: facility.floor,
                                time_slot: `${selectedDate} ${bookingTime}`,
                                status: 'pending', // payment required
                                booking_date: new Date().toISOString(),
                                requires_payment: true,
                                amount: 5
                            };
                            firebase.firestore().collection('bookings').add(bookingData)
                                .then(async () => {
                                    // Update facility status (legacy/global)
                                    await firebase.firestore().collection('facilities').doc(facility.id).update({ status: 'reserved' });
                                    // Update the availability for the specific date and time slot
                                    const slotStart = bookingTime.split(' - ')[0];
                                    const availabilityRef = firebase.firestore()
                                        .collection('facilities')
                                        .doc(facility.id)
                                        .collection('availability')
                                        .doc(selectedDate);
                                    await availabilityRef.update({ [slotStart]: 'reserved' });
                                })
                                .then(() => {
                                    modal.remove();
                                    loadFacilities();
                                    alert('Booking successful!');
                                })
                                .catch(err => {
                                    errorDiv.textContent = 'Booking failed. Please try again.';
                                    errorDiv.style.display = 'block';
                                });
                        });
                    });
                    return;
                }
                // Wait for Firebase Auth to be ready and check user
                firebase.auth().onAuthStateChanged(function(user) {
                    if (!user) {
                        errorDiv.textContent = 'You must be logged in to book.';
                        errorDiv.style.display = 'block';
                        return;
                    }
                    // Set status based on requires_payment
                    const bookingData = {
                        user_id: user.uid,
                        user_name: user.displayName || '',
                        user_email: user.email || '',
                        facility_id: facility.id,
                        facility_name: facility.name,
                        facilityType: facility.type, // use camelCase consistently
                        floor: facility.floor,
                        time_slot: `${selectedDate} ${bookingTime}`,
                        status: facility.requires_payment ? 'pending' : 'paid',
                        booking_date: new Date().toISOString(),
                        requires_payment: facility.requires_payment,
                        amount: facility.requires_payment ? 5 : 0
                    };
                    firebase.firestore().collection('bookings').add(bookingData)
                        .then(async () => {
                            // Update facility status (legacy/global)
                            await firebase.firestore().collection('facilities').doc(facility.id).update({ status: 'reserved' });
                            // Update the availability for the specific date and time slot
                            const slotStart = bookingTime.split(' - ')[0];
                            const availabilityRef = firebase.firestore()
                                .collection('facilities')
                                .doc(facility.id)
                                .collection('availability')
                                .doc(selectedDate);
                            await availabilityRef.update({ [slotStart]: 'reserved' });
                        })
                        .then(() => {
                            modal.remove();
                            loadFacilities();
                            alert('Booking successful!');
                        })
                        .catch(err => {
                            errorDiv.textContent = 'Booking failed. Please try again.';
                            errorDiv.style.display = 'block';
                        });
                });
            };
        });
    }

    function getCurrentSlot(slots) {
        const now = new Date();
        for (let i = 0; i < slots.length; i++) {
            const [start, end] = slots[i].split(' - ');
            const [startH, startM] = start.split(':').map(Number);
            const [endH, endM] = end.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
                return { index: i, slot: slots[i] };
            }
        }
        return null;
    }

    async function updateFacilityInUseStatus() {
        const allSlots = [
            '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
            '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00',
            '16:00 - 17:00', '17:00 - 18:00'
        ];
        const today = new Date().toISOString().split('T')[0];
        for (const fac of facilities) {
            const availabilityRef = firebase.firestore()
                .collection('facilities')
                .doc(fac.id)
                .collection('availability')
                .doc(today);
            const doc = await availabilityRef.get();
            if (doc.exists) {
                const data = doc.data();
                const current = getCurrentSlot(allSlots);
                if (current) {
                    const slotStart = allSlots[current.index].split(' - ')[0];
                    if (data[slotStart] === 'reserved') {
                        // Set current slot to in-use
                        await availabilityRef.update({ [slotStart]: 'in-use' });
                        console.log(`[updateFacilityInUseStatus] Facility: ${fac.name}, Slot: ${slotStart}, Set to: in-use`);
                    }
                    // Set previous slot back to reserved if it was in-use
                    if (current.index > 0) {
                        const prevSlotStart = allSlots[current.index - 1].split(' - ')[0];
                        if (data[prevSlotStart] === 'in-use') {
                            await availabilityRef.update({ [prevSlotStart]: 'reserved' });
                            console.log(`[updateFacilityInUseStatus] Facility: ${fac.name}, Prev Slot: ${prevSlotStart}, Set to: reserved`);
                        }
                    }
                }
            }
        }
        // Reload facilities to update UI
        loadFacilities();
    }

    // Payment modal for pool table bookings
    function showPaymentModal(facility, selectedDate, bookingTime, onPaymentSuccess) {
        let modal = document.getElementById('paymentModal');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'paymentModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.35)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
          <div style="background: #fff; border-radius: 16px; padding: 36px 32px; min-width: 350px; max-width: 95vw; box-shadow: 0 8px 32px rgba(0,0,0,0.18); position: relative; width: 400px;">
            <h2 style="margin-bottom: 8px; color: #222;">Payment Required</h2>
            <div style="margin-bottom: 8px;">Amount: <b>RM5</b></div>
            <div style="margin-bottom: 8px;">Facility: <b>${facility.name}</b></div>
            <div style="margin-bottom: 8px;">Time: <b>${bookingTime}</b></div>
            <div style="margin: 16px 0 12px 0; text-align:center;">
              <div style="margin-bottom: 8px; font-weight:600;">Scan QR Code to Pay</div>
              <div style="width:180px;height:180px;margin:0 auto;background:#f4f4f4;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center;">TnG QR Code</div>
            </div>
            <form id="paymentForm">
              <div style="margin-bottom:10px;">
                <label for="receiptFile">UPLOAD PAYMENT RECEIPT:</label><br>
                <input type="file" id="receiptFile" name="receiptFile" accept="image/*" required style="margin-top:6px;">
              </div>
              <div style="display:flex;gap:12px;justify-content:flex-end;">
                <button type="button" class="btn btn-secondary" id="cancelPaymentBtn">Cancel</button>
                <button type="submit" class="btn btn-primary">Upload Receipt</button>
              </div>
            </form>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('cancelPaymentBtn').onclick = () => modal.remove();
        document.getElementById('paymentForm').onsubmit = function(e) {
            e.preventDefault();
            // You can add upload logic here (e.g., to Firebase Storage)
            // For now, just simulate success
            modal.remove();
            if (onPaymentSuccess) onPaymentSuccess();
        };
    }

    // Initial load
    loadFacilities();
    // Call this on page load and every minute
    setInterval(updateFacilityInUseStatus, 60 * 1000);
    updateFacilityInUseStatus();
}); 