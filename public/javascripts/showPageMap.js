console.log('showPageMap.js loaded', { 
    campground: typeof campground !== 'undefined' ? campground : 'undefined',
    maptilerApiKey: typeof maptilerApiKey !== 'undefined' ? maptilerApiKey : 'undefined'
});

// Функция для отображения ошибки
function showMapError(message, details = '') {
    console.error('Map error:', message, details);
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div class="alert alert-warning text-center p-4">
                <h4>⚠️ Map Not Available</h4>
                <p>${message}</p>
                ${details ? `<small class="text-muted">${details}</small>` : ''}
            </div>
        `;
    }
}

// Функция для инициализации карты
function initializeMap() {
    // Проверяем наличие необходимых данных
    if (typeof maptilerApiKey === 'undefined' || maptilerApiKey === '') {
        showMapError('Map configuration error', 'API key missing');
        return;
    }

    if (typeof campground === 'undefined' || !campground) {
        showMapError('Campground data not available');
        return;
    }

    try {
        maptilersdk.config.apiKey = maptilerApiKey;

        // Проверяем и исправляем координаты
        let coordinates = [];
        
        if (campground.geometry && 
            campground.geometry.coordinates && 
            Array.isArray(campground.geometry.coordinates) &&
            campground.geometry.coordinates.length === 2) {
            
            coordinates = campground.geometry.coordinates;
            console.log('Using campground coordinates:', coordinates);
            
        } else {
            // Fallback координаты (Нью-Йорк)
            coordinates = [-74.0060, 40.7128];
            console.log('Using fallback coordinates:', coordinates);
        }

        // Дополнительная проверка на валидность координат
        const isValidCoordinates = coordinates.length === 2 && 
                                  typeof coordinates[0] === 'number' && 
                                  typeof coordinates[1] === 'number';
        
        if (!isValidCoordinates) {
            console.error('Invalid coordinates:', coordinates);
            coordinates = [-74.0060, 40.7128]; // Принудительный fallback
        }

        const map = new maptilersdk.Map({
            container: 'map',
            style: maptilersdk.MapStyle.BRIGHT,
            center: coordinates,
            zoom: 10
        });

        map.on('load', function() {
            new maptilersdk.Marker()
                .setLngLat(coordinates)
                .setPopup(
                    new maptilersdk.Popup({ offset: 25 })
                        .setHTML(
                            `<h3>${campground.title}</h3><p>${campground.location}</p>`
                        )
                )
                .addTo(map);
                
            console.log('Map successfully loaded with coordinates:', coordinates);
        });

        map.on('error', function(e) {
            showMapError('Error loading map', e.message);
        });

    } catch (error) {
        showMapError('Failed to initialize map', error.message);
    }
}

// Запускаем инициализацию карты
initializeMap();