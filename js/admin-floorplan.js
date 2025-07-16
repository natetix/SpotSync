// Admin Interactive Floorplan for SpotSync
// Based on user-floorplan.js, with admin features

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

    function renderFacilities() {
        const area = document.createElement('div');
        area.style.position = 'relative';
        area.style.width = '700px';
        area.style.height = '500px';
        area.style.margin = '24px auto 0 auto';
        area.style.background = '#e6ecf5';
        area.style.borderRadius = '18px';
        area.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)';
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
            card.style.cursor = 'pointer'; // Admin can always click
            card.style.opacity = '1';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            card.innerHTML = `<div style="font-size:18px;font-weight:600;">${fac.name}</div>`;
            card.onclick = () => showAdminFacilityModal(fac);
            area.appendChild(card);
        });
        return area;
    }

    function getStatusColor(status) {
        switch (status) {
            case 'available': return '#4CAF50'; // Green
            case 'reserved': return '#F44336'; // Red
            case 'in-use': return '#FF9800'; // Orange
            default: return '#64748b'; // Gray
        }
    }

    function getFacilityIcon(type) {
        switch (type) {
            case 'Pool Table': return '🏊';
            case 'Cubicle': return '💻';
            case 'Study Room': return '📚';
            case 'Discussion Room': return '💬';
            default: return '⚙️';
        }
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function render() {
        floorplanContainer.innerHTML = '';
        // Admin Mode badge
        const badge = document.createElement('div');
        badge.textContent = 'Admin Mode';
        badge.style.position = 'absolute';
        badge.style.top = '16px';
        badge.style.right = '32px';
        badge.style.background = '#2563eb';
        badge.style.color = '#fff';
        badge.style.padding = '6px 16px';
        badge.style.borderRadius = '8px';
        badge.style.fontWeight = '700';
        badge.style.zIndex = '1000';
        floorplanContainer.appendChild(badge);
        floorplanContainer.appendChild(renderDateTimeSelectors());
        floorplanContainer.appendChild(renderFloorSelector());
        floorplanContainer.appendChild(renderLegend());
        floorplanContainer.appendChild(renderFacilities());
    }

    function loadFacilities() {
        const floorConfig = floors.find(f => f.floor === currentFloor);
        // First, get all facilities for the floor
        firebase.firestore().collection('facilities')
            .where('floor', '==', currentFloor)
            .get()
            .then(snapshot => {
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
                // Now, check bookings for the selected date and time slot
                if (facilities.length === 0) return render();
                firebase.firestore().collection('bookings')
                    .where('floor', '==', currentFloor)
                    .get()
                    .then(bookSnap => {
                        const now = new Date();
                        facilities.forEach(fac => {
                            // Find a booking for this facility, date, and time slot
                            let booked = false;
                            let inUse = false;
                            bookSnap.forEach(bdoc => {
                                const b = bdoc.data();
                                // Compare date and time slot
                                if (
                                    b.facility_id === fac.id &&
                                    b.time_slot &&
                                    b.time_slot.startsWith(selectedDate) &&
                                    b.time_slot.includes(selectedTimeSlot)
                                ) {
                                    booked = true;
                                    // If booking is for today and current time is within slot, mark as in use
                                    if (selectedDate === new Date().toISOString().split('T')[0]) {
                                        // Parse slot times
                                        const [startStr, endStr] = selectedTimeSlot.split(' - ');
                                        const start = parseTime(startStr);
                                        const end = parseTime(endStr);
                                        const nowMinutes = now.getHours() * 60 + now.getMinutes();
                                        if (nowMinutes >= start && nowMinutes < end) {
                                            inUse = true;
                                        }
                                    }
                                }
                            });
                            if (inUse) fac.status = 'in-use';
                            else if (booked) fac.status = 'reserved';
                            else fac.status = 'available';
                        });
                        render();
                    });
            });
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

    // Admin modal: show all bookings for this facility and date, with approve/reject/override
    function showAdminFacilityModal(facility) {
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
          <div style="background: #fff; border-radius: 16px; padding: 36px 32px; min-width: 400px; max-width: 95vw; box-shadow: 0 8px 32px rgba(0,0,0,0.18); position: relative; width: 500px;">
            <button id="closeBookingModal" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;">&times;</button>
            <h2 style="margin-bottom: 8px; color: #4f46e5;">${facility.name} (Admin)</h2>
            <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
              <div><b>Date:</b> ${formatDateDisplay(selectedDate)}</div>
              <div><b>Facility:</b> ${facility.name}</div>
              <div><b>Status:</b> <span id="facilityStatusText">${facility.status}</span></div>
              <div style="margin-top:8px;">
                <label for="adminStatusOverride">Override Status:</label>
                <select id="adminStatusOverride" style="margin-left:8px;">
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="in-use">In Use</option>
                </select>
                <button id="applyStatusOverride" class="btn btn-secondary" style="margin-left:8px;">Apply</button>
              </div>
            </div>
            <div style="margin-bottom: 12px;">
              <b>Bookings for this date:</b>
              <div id="adminBookingsTable" style="max-height:200px;overflow-y:auto;margin-top:8px;"></div>
            </div>
            <button class="btn btn-primary" id="adminNewBookingBtn">Create New Booking</button>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('closeBookingModal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        // Status override logic
        document.getElementById('applyStatusOverride').onclick = function() {
            const newStatus = document.getElementById('adminStatusOverride').value;
            firebase.firestore().collection('facilities').doc(facility.id).update({ status: newStatus })
                .then(() => {
                    document.getElementById('facilityStatusText').textContent = newStatus;
                    loadFacilities();
                });
        };

        // Fetch bookings for this facility and date
        firebase.firestore().collection('bookings')
            .where('facility_id', '==', facility.id)
            .get()
            .then(snapshot => {
                const bookings = [];
                snapshot.forEach(doc => {
                    const b = doc.data();
                    if (b.time_slot && b.time_slot.startsWith(selectedDate)) {
                        bookings.push({ id: doc.id, ...b });
                    }
                });
                // Render bookings table
                const tableDiv = document.getElementById('adminBookingsTable');
                if (bookings.length === 0) {
                    tableDiv.innerHTML = '<div style="color:#64748b;">No bookings for this date.</div>';
                } else {
                    let html = '<table style="width:100%;font-size:14px;"><tr><th>User</th><th>Time Slot</th><th>Status</th><th>Action</th></tr>';
                    bookings.forEach(b => {
                        html += `<tr>
                            <td>${b.user_email || '—'}<br><span style="color:#888;">${b.user_name || ''}</span></td>
                            <td>${b.time_slot || '—'}</td>
                            <td><span style="font-weight:600;">${b.status}</span></td>
                            <td>`;
                        if (b.status === 'pending') {
                            html += `<button class="btn btn-success" data-approve="${b.id}">Approve</button> <button class="btn btn-danger" data-reject="${b.id}">Reject</button>`;
                        } else {
                            html += '-';
                        }
                        html += `</td></tr>`;
                    });
                    html += '</table>';
                    tableDiv.innerHTML = html;
                    // Add event listeners for approve/reject
                    bookings.forEach(b => {
                        if (b.status === 'pending') {
                            const approveBtn = tableDiv.querySelector(`[data-approve="${b.id}"]`);
                            const rejectBtn = tableDiv.querySelector(`[data-reject="${b.id}"]`);
                            if (approveBtn) approveBtn.onclick = function() {
                                firebase.firestore().collection('bookings').doc(b.id).update({ status: 'paid' })
                                    .then(() => { loadFacilities(); showAdminFacilityModal(facility); });
                            };
                            if (rejectBtn) rejectBtn.onclick = function() {
                                firebase.firestore().collection('bookings').doc(b.id).update({ status: 'rejected' })
                                    .then(() => { loadFacilities(); showAdminFacilityModal(facility); });
                            };
                        }
                    });
                }
            });

        // Add slot availability editor for admins
        const allSlots = [
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00'
        ];
        const availabilityRef = firebase.firestore()
            .collection('facilities')
            .doc(facility.id)
            .collection('availability')
            .doc(selectedDate);
        availabilityRef.get().then(doc => {
            let slotData = {};
            if (doc.exists) slotData = doc.data();
            // Render slot status controls
            const slotTable = document.createElement('table');
            slotTable.style.width = '100%';
            slotTable.style.margin = '16px 0';
            slotTable.innerHTML = '<tr><th>Time Slot</th><th>Status</th></tr>';
            allSlots.forEach(slot => {
                const tr = document.createElement('tr');
                const tdSlot = document.createElement('td');
                tdSlot.textContent = slot;
                const tdStatus = document.createElement('td');
                const select = document.createElement('select');
                ['available', 'reserved', 'in-use'].forEach(status => {
                    const opt = document.createElement('option');
                    opt.value = status;
                    opt.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                    if ((slotData[slot] || 'available') === status) opt.selected = true;
                    select.appendChild(opt);
                });
                tdStatus.appendChild(select);
                tr.appendChild(tdSlot);
                tr.appendChild(tdStatus);
                slotTable.appendChild(tr);
            });
            // Add Save button
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save Slot Statuses';
            saveBtn.className = 'btn btn-primary';
            saveBtn.style.marginTop = '10px';
            saveBtn.onclick = async function() {
                // Gather new statuses
                const updates = {};
                const selects = slotTable.querySelectorAll('select');
                allSlots.forEach((slot, i) => {
                    updates[slot] = selects[i].value;
                });
                await availabilityRef.set(updates, { merge: true });
                alert('Availability updated!');
                // Optionally, refresh UI
                showAdminFacilityModal(facility);
            };
            // Add to modal
            const bookingsTableDiv = modal.querySelector('#adminBookingsTable');
            bookingsTableDiv.appendChild(document.createElement('hr'));
            bookingsTableDiv.appendChild(document.createTextNode('Edit Slot Availability:'));
            bookingsTableDiv.appendChild(slotTable);
            bookingsTableDiv.appendChild(saveBtn);
        });

        // Admin can create a new booking for any slot
        document.getElementById('adminNewBookingBtn').onclick = function() {
            // Show booking form (reuse user modal logic, but allow all slots)
            modal.remove();
            showAdminBookingForm(facility);
        };
    }

    // Admin booking form: can book any slot, even if reserved
    function showAdminBookingForm(facility) {
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
        modal.innerHTML = `
          <div style="background: #fff; border-radius: 16px; padding: 36px 32px; min-width: 350px; max-width: 95vw; box-shadow: 0 8px 32px rgba(0,0,0,0.18); position: relative; width: 400px;">
            <button id="closeBookingModal" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;">&times;</button>
            <h2 style="margin-bottom: 8px; color: #4f46e5;">Create Booking (Admin)</h2>
            <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
              <div><b>Date:</b> ${formatDateDisplay(selectedDate)}</div>
              <div><b>Facility:</b> ${facility.name}</div>
            </div>
            <form id="adminBookingForm">
              <div style="margin-bottom:12px;">
                <label for="bookingTime">Select Time Slot:</label>
                <select id="bookingTime" name="bookingTime" required style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;">
                  <option value="">Choose a time slot</option>
                </select>
              </div>
              <div style="margin-bottom:12px;">
                <label for="userEmail">User Email:</label>
                <input type="email" id="userEmail" name="userEmail" required style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;">
              </div>
              <div style="margin-bottom:12px;">
                <label for="userName">User Name:</label>
                <input type="text" id="userName" name="userName" required style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;">
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

        // Populate all slots (admin can book any slot)
        const form = document.getElementById('adminBookingForm');
        const errorDiv = document.getElementById('bookingError');
        const timeSelect = document.getElementById('bookingTime');
        const allSlots = [
            '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
            '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00',
            '16:00 - 17:00', '17:00 - 18:00'
        ];
        allSlots.forEach(slot => {
            const opt = document.createElement('option');
            opt.value = slot;
            opt.textContent = slot;
            timeSelect.appendChild(opt);
        });

        form.onsubmit = function(e) {
            e.preventDefault();
            errorDiv.style.display = 'none';
            const bookingTime = form.bookingTime.value;
            const userEmail = form.userEmail.value;
            const userName = form.userName.value;
            if (!selectedDate || !bookingTime || !userEmail || !userName) {
                errorDiv.textContent = 'Please fill all fields.';
                errorDiv.style.display = 'block';
                return;
            }
            // Create booking as admin
            const bookingData = {
                user_id: 'admin',
                user_name: userName,
                user_email: userEmail,
                facility_id: facility.id,
                facility_name: facility.name,
                facilityType: facility.type,
                floor: facility.floor,
                time_slot: `${selectedDate} ${bookingTime}`,
                status: facility.requires_payment ? 'pending' : 'paid',
                booking_date: new Date().toISOString(),
                requires_payment: facility.requires_payment,
                amount: facility.requires_payment ? 5 : 0
            };
            firebase.firestore().collection('bookings').add(bookingData)
                .then(() => {
                    return firebase.firestore().collection('facilities').doc(facility.id).update({ status: 'reserved' });
                })
                .then(() => {
                    modal.remove();
                    loadFacilities();
                    alert('Booking created successfully!');
                })
                .catch(err => {
                    errorDiv.textContent = 'Booking failed. Please try again.';
                    errorDiv.style.display = 'block';
                });
        };
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

    // Initial load
    loadFacilities();
});
