const API_BASE = '/api';

async function loadTrucks() {
    const grid = document.getElementById('truck-grid');
    try {
        const response = await fetch(`${API_BASE}/trucks`);
        const trucks = await response.json();

        if (trucks.error) {
            throw new Error(trucks.error);
        }

        if (!Array.isArray(trucks)) {
            throw new Error('Received invalid data from server');
        }

        grid.innerHTML = '';

        if (trucks.length === 0) {
            grid.innerHTML = '<p>No trucks found in the fleet.</p>';
            return;
        }

        // For each truck, we might want to fetch its primary image or details
        // For now, we'll just display the basic info
        for (const truck of trucks) {
            const card = document.createElement('div');
            card.className = 'truck-card';

            // Fetch details to get images (inefficient N+1 but simple for now as per spec)
            // In a real app, we'd include a primary image in the list response
            let imageUrl = 'https://placehold.co/600x400?text=No+Image';
            try {
                const detailRes = await fetch(`${API_BASE}/trucks/${truck.id}`);
                const detail = await detailRes.json();
                if (detail.images && detail.images.length > 0) {
                    imageUrl = detail.images[0].image_url;
                }
            } catch (e) {
                console.error('Failed to load image for truck', truck.id);
            }

            card.innerHTML = `
        <img src="${imageUrl}" alt="${truck.year} ${truck.chassis_mfg}" class="truck-image">
        <div class="truck-details">
          <div class="truck-title">
            ${truck.name ? `<span class="truck-name">${truck.name}</span>` : ''}
            ${truck.year} ${truck.chassis_mfg}
          </div>
          ${truck.department_name ? `<div class="truck-dept">${truck.department_name}</div>` : ''}
          <div class="truck-specs">
            <div>Pump: ${truck.pump_capacity} GPM</div>
            <div>Tank: ${truck.water_capacity} Gal</div>
            ${truck.aerial_height > 0 ? `<div>Aerial: ${truck.aerial_height}' ${truck.aerial_type || ''}</div>` : ''}
          </div>
        </div>
      `;
            grid.appendChild(card);
        }
    } catch (e) {
        grid.innerHTML = `<p>Error loading fleet: ${e.message}</p>`;
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Convert number strings to integers
    const numberFields = [
        'year', 'pump_capacity', 'water_capacity',
        'foam_a_capacity', 'foam_b_capacity', 'aerial_height',
        'department_id'
    ];

    numberFields.forEach(field => {
        if (data[field]) data[field] = parseInt(data[field], 10);
    });

    try {
        const response = await fetch(`${API_BASE}/trucks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('truck-form').classList.add('hidden');
            document.getElementById('upload-section').classList.remove('hidden');
            document.getElementById('new-truck-id').textContent = result.id;
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (e) {
        alert(`Error: ${e.message}`);
    }
}

async function uploadImage() {
    const truckId = document.getElementById('new-truck-id').textContent;
    const fileInput = document.getElementById('image-upload');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file first');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE}/trucks/${truckId}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('upload-status').innerHTML =
                `<p style="color: green">Image uploaded successfully! <br> <a href="index.html">Return to Fleet</a></p>`;
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (e) {
        alert(`Error: ${e.message}`);
    }
}

async function loadDepartments() {
    const select = document.getElementById('department_id');
    if (!select) return;

    try {
        const response = await fetch(`${API_BASE}/departments`);
        const departments = await response.json();

        // Keep the first option (Select Department...)
        select.innerHTML = '<option value="">Select Department...</option>';

        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });
    } catch (e) {
        console.error('Failed to load departments', e);
    }
}

async function createNewDepartment() {
    const name = prompt('Enter new department name:');
    if (!name) return;

    try {
        const response = await fetch(`${API_BASE}/departments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            await loadDepartments();
        } else {
            alert('Failed to create department');
        }
    } catch (e) {
        alert(`Error: ${e.message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('truck-grid')) {
        loadTrucks();
    }
    if (document.getElementById('department_id')) {
        loadDepartments();
    }
});
