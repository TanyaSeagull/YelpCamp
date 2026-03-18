// Ждем загрузки DOM и SDK
document.addEventListener('DOMContentLoaded', function() {
    console.log('🗺️ clusterMap.js: DOM loaded, checking for maptilersdk...');
    
    // Функция для проверки загрузки SDK
    function initClusterMap() {
        if (typeof maptilersdk === 'undefined') {
            console.log('⏳ clusterMap.js: Ожидание загрузки Maptiler SDK...');
            setTimeout(initClusterMap, 500);
            return;
        }
        
        console.log('✅ clusterMap.js: Maptiler SDK загружен, версия:', maptilersdk.version);
        
        // Проверяем наличие API ключа
        if (typeof maptilerApiKey === 'undefined' || !maptilerApiKey) {
            console.error('❌ clusterMap.js: API ключ отсутствует');
            return;
        }
        
        // Проверяем наличие данных
        if (typeof campgrounds === 'undefined' || !campgrounds) {
            console.error('❌ clusterMap.js: Данные campgrounds отсутствуют');
            return;
        }
        
        try {
            // Устанавливаем API ключ
            maptilersdk.config.apiKey = maptilerApiKey;
            
            // Создаем карту
            const map = new maptilersdk.Map({
                container: 'cluster-map',
                style: maptilersdk.MapStyle.BRIGHT,
                center: [-103.59179687498357, 40.66995747013945],
                zoom: 3
            });
            
            // Ждем загрузки карты
            map.on('load', function () {
                console.log('✅ clusterMap.js: Карта загружена');
                
                map.addSource('campgrounds', {
                    type: 'geojson',
                    data: campgrounds,
                    cluster: true,
                    clusterMaxZoom: 14,
                    clusterRadius: 50
                });
                
                map.addLayer({
                    id: 'clusters',
                    type: 'circle',
                    source: 'campgrounds',
                    filter: ['has', 'point_count'],
                    paint: {
                        'circle-color': [
                            'step',
                            ['get', 'point_count'],
                            '#00BCD4',
                            10,
                            '#2196F3',
                            30,
                            '#3F51B5'
                        ],
                        'circle-radius': [
                            'step',
                            ['get', 'point_count'],
                            15,
                            10,
                            20,
                            30,
                            25
                        ]
                    }
                });
                
                map.addLayer({
                    id: 'cluster-count',
                    type: 'symbol',
                    source: 'campgrounds',
                    filter: ['has', 'point_count'],
                    layout: {
                        'text-field': '{point_count_abbreviated}',
                        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                        'text-size': 12
                    }
                });
                
                map.addLayer({
                    id: 'unclustered-point',
                    type: 'circle',
                    source: 'campgrounds',
                    filter: ['!', ['has', 'point_count']],
                    paint: {
                        'circle-color': '#11b4da',
                        'circle-radius': 4,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#fff'
                    }
                });
                
                // Обработчики кликов
                map.on('click', 'clusters', async (e) => {
                    const features = map.queryRenderedFeatures(e.point, {
                        layers: ['clusters']
                    });
                    const clusterId = features[0].properties.cluster_id;
                    const zoom = await map.getSource('campgrounds').getClusterExpansionZoom(clusterId);
                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom
                    });
                });
                
                map.on('click', 'unclustered-point', function (e) {
                    const { popUpMarkup } = e.features[0].properties;
                    const coordinates = e.features[0].geometry.coordinates.slice();
                    
                    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                    }
                    
                    new maptilersdk.Popup()
                        .setLngLat(coordinates)
                        .setHTML(popUpMarkup)
                        .addTo(map);
                });
                
                map.on('mouseenter', 'clusters', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'clusters', () => {
                    map.getCanvas().style.cursor = '';
                });
            });
            
            map.on('error', function(e) {
                console.error('❌ clusterMap.js: Ошибка карты', e);
            });
            
        } catch (error) {
            console.error('❌ clusterMap.js: Критическая ошибка', error);
        }
    }
    
    // Запускаем инициализацию
    initClusterMap();
});