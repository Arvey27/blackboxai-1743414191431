// Initialize map and tracking variables
let map;
let marker;
let polyline;
let watchId = null;
let positions = [];

// DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const latitudeEl = document.getElementById('latitude');
const longitudeEl = document.getElementById('longitude');
const speedEl = document.getElementById('speed');
const accuracyEl = document.getElementById('accuracy');
const distanceEl = document.getElementById('distance');
const durationEl = document.getElementById('duration');
const pointCountEl = document.getElementById('pointCount');

// Tracking stats
let startTime = null;
let lastPositionTime = null;

// Initialize the map
function initMap() {
    map = L.map('map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Start GPS tracking
function startTracking() {
    if (navigator.geolocation) {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        // Clear previous positions
        positions = [];
        if (polyline) map.removeLayer(polyline);
        
        watchId = navigator.geolocation.watchPosition(
            position => {
                const { latitude, longitude, speed, accuracy } = position.coords;
                
                // Update position display
                latitudeEl.textContent = latitude.toFixed(6);
                longitudeEl.textContent = longitude.toFixed(6);
                speedEl.textContent = speed ? `${(speed * 3.6).toFixed(2)} km/h` : '-';
                accuracyEl.textContent = `${accuracy.toFixed(2)} meters`;
                
                // Update map
                updateMap(position.coords);
                
                // Store position
                positions.push([latitude, longitude]);
            },
            error => {
                console.error('Error getting location:', error);
                alert(`Error: ${error.message}`);
                stopTracking();
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    } else {
        alert('Geolocation is not supported by your browser');
    }
}

// Update map with new position
function updateMap(coords) {
    const { latitude, longitude } = coords;
    const newLatLng = L.latLng(latitude, longitude);
    
    if (!marker) {
        // Create marker if it doesn't exist
        marker = L.marker(newLatLng).addTo(map);
    } else {
        // Move existing marker
        marker.setLatLng(newLatLng);
    }
    
    // Center map on new position
    map.setView(newLatLng);
    
    // Update polyline
    if (positions.length > 1) {
        if (polyline) map.removeLayer(polyline);
        polyline = L.polyline(positions, {color: 'blue'}).addTo(map);
    }
    
    // Update stats
    updateStats();
}

// Update tracking statistics
function updateStats() {
    // Update point count
    pointCountEl.textContent = positions.length;
    
    // Update duration
    if (startTime) {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        durationEl.textContent = `${mins}m ${secs}s`;
    }
    
    // Update distance
    if (positions.length > 1) {
        const distance = calculateDistance(positions);
        distanceEl.textContent = `${distance.toFixed(2)} km`;
    }
}

// Clear tracking data
function clearTracking() {
    positions = [];
    startTime = null;
    lastPositionTime = null;
    
    if (polyline) map.removeLayer(polyline);
    if (marker) map.removeLayer(marker);
    polyline = null;
    marker = null;
    
    // Reset UI
    latitudeEl.textContent = '-';
    longitudeEl.textContent = '-';
    speedEl.textContent = '-';
    accuracyEl.textContent = '-';
    distanceEl.textContent = '0 km';
    durationEl.textContent = '0s';
    pointCountEl.textContent = '0';
}

// Stop GPS tracking
function stopTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    // Save the track to history
    saveTrack();
}

// Save track to localStorage
function saveTrack() {
    if (positions.length < 2) return;
    
    const tracks = JSON.parse(localStorage.getItem('gpsTracks') || '[]');
    const newTrack = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        startTime: new Date().toLocaleTimeString(),
        positions: positions,
        distance: calculateDistance(positions),
        duration: getTrackingDuration()
    };
    tracks.push(newTrack);
    localStorage.setItem('gpsTracks', JSON.stringify(tracks));
    
    // Show success notification
    showNotification(`Track saved: ${newTrack.distance.toFixed(2)} km over ${newTrack.duration}`);
}

// Calculate approximate distance in kilometers
function calculateDistance(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        const [lat1, lon1] = points[i-1];
        const [lat2, lon2] = points[i];
        total += haversineDistance(lat1, lon1, lat2, lon2);
    }
    return total;
}

// Haversine formula for distance between two points
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Calculate tracking duration
function getTrackingDuration() {
    if (positions.length < 2) return '0s';
    const start = new Date(positions[0].timestamp || Date.now() - positions.length * 1000);
    const end = new Date(positions[positions.length-1].timestamp || Date.now());
    const seconds = Math.round((end - start) / 1000);
    return `${Math.floor(seconds/60)}m ${seconds%60}s`;
}

// Show notification message
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    startBtn.addEventListener('click', startTracking);
    stopBtn.addEventListener('click', stopTracking);
    clearBtn.addEventListener('click', clearTracking);
    
    // Add timestamp to positions when tracking
    const originalWatchPosition = navigator.geolocation.watchPosition;
    navigator.geolocation.watchPosition = function(success, error, options) {
        return originalWatchPosition.call(
            this,
            position => {
                position.coords.timestamp = Date.now();
                success(position);
            },
            error,
            options
        );
    };
});
