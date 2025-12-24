const API_BASE = '/api';

async function loadTrucks(forceLoad = false) {
    let grid = document.getElementById('truck-grid');

    // Build Query Params
    const params = new URLSearchParams();

    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value.trim()) {
        params.append('q', searchInput.value.trim());
    }

    const yearInput = document.getElementById('filter-year');
    if (yearInput && yearInput.value) {
        params.append('year', yearInput.value);
    }

    const chassisInput = document.getElementById('filter-chassis');
    if (chassisInput && chassisInput.value.trim()) {
        params.append('chassis_mfg', chassisInput.value.trim());
    }

    const deptInput = document.getElementById('filter-dept');
    if (deptInput && deptInput.value) {
        params.append('department_id', deptInput.value);
    }

    const hasFilters = [...params.keys()].length > 0;

    // If on search page, don't load initially unless filters or forced
    if (searchInput && !hasFilters && !forceLoad) {
        return;
    }

    // Create grid if it doesn't exist (e.g., search page after removal)
    if (!grid) {
        const main = document.querySelector('main');
        if (main) {
            const section = document.createElement('section');
            section.className = 'fleet-section';
            grid = document.createElement('div');
            grid.id = 'truck-grid';
            grid.className = 'truck-grid';
            section.appendChild(grid);
            main.appendChild(section);
        }
    }

    if (!grid) return;

    try {
        const response = await fetch(`${API_BASE}/trucks?${params.toString()}`);
        const trucks = await response.json();

        if (trucks.error) {
            throw new Error(trucks.error);
        }

        if (!Array.isArray(trucks)) {
            throw new Error('Received invalid data from server');
        }

        grid.innerHTML = '';

        if (trucks.length === 0) {
            grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 2rem;">No trucks found matching your criteria.</p>';
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

async function loadDepartments(targetId = 'department_id') {
    const select = document.getElementById(targetId);
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

async function loadRecentlyAdded() {
    const track = document.getElementById('recently-added-carousel');
    if (!track) return;

    try {
        const response = await fetch(`${API_BASE}/trucks`);
        const trucks = await response.json();

        if (trucks.error) throw new Error(trucks.error);

        track.innerHTML = '';

        // Take latest 8 trucks for the carousel
        const latestTrucks = trucks.slice(0, 8);

        if (latestTrucks.length === 0) {
            track.innerHTML = '<p class="loading-text">No trucks found yet.</p>';
            return;
        }

        for (const truck of latestTrucks) {
            const card = document.createElement('div');
            card.className = 'truck-card';

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
                </div>
            `;
            track.appendChild(card);
        }

        initializeCarousel();
    } catch (e) {
        track.innerHTML = `<p class="loading-text">Error: ${e.message}</p>`;
    }
}

function initializeCarousel() {
    const track = document.getElementById('recently-added-carousel');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    if (!track || !prevBtn || !nextBtn) return;

    let currentIndex = 0;
    const items = track.querySelectorAll('.truck-card');
    const itemWidth = 320 + 32; // card width + gap

    function updateCarousel() {
        const containerWidth = track.parentElement.clientWidth;
        const visibleItems = Math.floor(containerWidth / itemWidth);
        const maxIndex = Math.max(0, items.length - visibleItems);

        if (currentIndex > maxIndex) currentIndex = maxIndex;
        if (currentIndex < 0) currentIndex = 0;

        track.style.transform = `translateX(-${currentIndex * itemWidth}px)`;

        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex >= maxIndex;
    }

    prevBtn.addEventListener('click', () => {
        currentIndex--;
        updateCarousel();
    });

    nextBtn.addEventListener('click', () => {
        currentIndex++;
        updateCarousel();
    });

    window.addEventListener('resize', updateCarousel);
    updateCarousel();
}

document.addEventListener('DOMContentLoaded', () => {
    // Determine which page we are on
    const isSearchPage = document.getElementById('search-input') !== null;
    const isHomePage = document.getElementById('recently-added-carousel') !== null;
    const isContributePage = document.getElementById('truck-form') !== null;

    if (isSearchPage) {
        loadTrucks();
        loadDepartments('filter-dept');

        // Search Listeners
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', loadTrucks);
        }

        const textInputs = ['search-input', 'filter-year', 'filter-chassis'];
        textInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') loadTrucks();
                });
            }
        });

        const deptFilter = document.getElementById('filter-dept');
        if (deptFilter) {
            deptFilter.addEventListener('change', loadTrucks);
        }
    }

    if (isHomePage) {
        loadRecentlyAdded();
    }

    if (isContributePage) {
        loadDepartments('department_id');
    }
});
