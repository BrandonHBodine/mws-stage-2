const staticCacheName = 'restaurant-reviews-v1';
const contentImgsCache = 'restaurant-images-v1';
const mapCache = 'restaurant-map-v1';
const allCaches = [staticCacheName, contentImgsCache, mapCache];
const filesArr = [
	'/index.html',
	'/restaurant.html',
	'css/styles.css',
	'js/dbhelper.js',
	'js/main.js',
	'js/restaurant_info.js',
	'data/restaurants.json'
];

self.addEventListener('install', function(event) {
	console.log('ServiceWorker installed');
	event.waitUntil(
		caches.open(staticCacheName).then(function(cache) {
			return cache.addAll(filesArr);
		})
	);
});

self.addEventListener('activate', function(event) {
	event.waitUntil(
		caches.keys().then(function(cacheNames) {
			return Promise.all(
				cacheNames
					.filter(function(cacheName) {
						return (
							cacheName.startsWith('restaurant-') &&
							!allCaches.includes(cacheName)
						);
					})
					.map(function(cacheName) {
						return caches.delete(cacheName);
					})
			);
		})
	);
});

self.addEventListener('fetch', function(event) {
	let requestUrl = new URL(event.request.url);

	// Check for requests made to app and are special cases
	if (requestUrl.origin === location.origin) {
		if (requestUrl.pathname === '/') {
			console.log('Serving cached index page');
			event.respondWith(caches.match('/index.html'));
			return;
		}

		if (requestUrl.pathname === '/restaurant.html') {
			// URL params stay intact
			console.log('Serving restraunt page');
			event.respondWith(caches.match('/restaurant.html'));
			return;
		}

		// Check for images to serve
		if (requestUrl.pathname.startsWith('/img/')) {
			console.log('Image requested, checking cache');
			event.respondWith(servePhoto(event.request));
			return;
		}

		// Check for map
		if (requestUrl.pathname.startsWith('/maps/api/js')) {
			console.log('Map requested, checking cache');
			event.respondWith(serveMap(event.request));
			return;
		}
	}

	// Catch all cache response
	event.respondWith(
		caches.match(event.request).then(function(response) {
			return response || fetch(event.request);
		})
	);
});

function servePhoto(request) {
	// Update to user friendly name
	const storageUrl = request.url.replace(/-\d+px\.jpg$/, '');

	// Add image to cache and serve image if in cache
	return caches.open(contentImgsCache).then(function(cache) {
		return cache.match(storageUrl).then(function(response) {
			if (response) return response;

			return fetch(request).then(function(networkResponse) {
				cache.put(storageUrl, networkResponse.clone());
				return networkResponse;
			});
		});
	});
}

function serveMap(requestMap) {
	// I wonder what it's response type is?
	const mapName = 'map';

	return caches.open(mapCache).then(function(cache) {
		return cache.match(mapName).then(function(mapResponse) {
			// If there is a map in the cache respond with it
			if (mapResponse) return mapResponse;

			// Get map then cache and serve it
			return fetch(requestMap, { mode: 'no-cors' }).then(function(
				networkResponseMap
			) {
				cache.put(mapName, networkResponseMap.clone());
				return networkResponseMap;
			});
		});
	});
}
