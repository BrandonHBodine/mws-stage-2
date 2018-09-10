import idb from 'idb';

const staticCacheName = 'restaurant-reviews-v1';
const contentImgsCache = 'restaurant-images-v1';
const mapCache = 'restaurant-map-v1';
const allCaches = [staticCacheName, contentImgsCache, mapCache];
const filesArr = [
	'/index.html',
	'/restaurant.html',
	'/restaurant.bundle.js',
	'/main.bundle.js'
];

var dbPromise = idb.open('restaurant-reviews', 1, function(upgradeDB) {
	upgradeDB.createObjectStore('restaurants');
});

const idbRestaurants = {
	get(key) {
		return dbPromise.then(db => {
			return db
				.transaction('restaurants')
				.objectStore('restaurants')
				.get(key);
		});
	},
	set(key, val) {
		return dbPromise.then(db => {
			const tx = db.transaction('restaurants', 'readwrite');
			tx.objectStore('restaurants').put(val, key);
			return tx.complete;
		});
	},
	delete(key) {
		return dbPromise.then(db => {
			const tx = db.transaction('restaurants', 'readwrite');
			tx.objectStore('restaurants').delete(key);
			return tx.complete;
		});
	},
	clear() {
		return dbPromise.then(db => {
			const tx = db.transaction('restaurants', 'readwrite');
			tx.objectStore('restaurants').clear();
			return tx.complete;
		});
	},
	keys() {
		return dbPromise.then(db => {
			const tx = db.transaction('restaurants');
			const keys = [];
			const store = tx.objectStore('restaurants');

			// This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
			// openKeyCursor isn't supported by Safari, so we fall back
			(store.iterateKeyCursor || store.iterateCursor).call(store, cursor => {
				if (!cursor) return;
				keys.push(cursor.key);
				cursor.continue();
			});

			return tx.complete.then(() => keys);
		});
	}
};

self.addEventListener('install', function(event) {
	console.log('ServiceWorker installed');
	event.waitUntil(
		caches
			.open(staticCacheName)
			.then(function(cache) {
				return cache.addAll(filesArr);
			})
			.catch(function(err) {
				console.log('Error has occured: ', err);
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

	// Resturants JSON
	if (requestUrl.pathname === '/restaurants') {
		event.respondWith(serveRestaurantsJSON(event.request));
		return;
	}

	// Catch all cache external responses
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

function serveRestaurantsJSON(requestJSON) {
	return idbRestaurants.get('restaurants-json').then(function(val) {
		if (val) {
			console.log('IndexDB JSON Found')
			return new Response(JSON.stringify(val));
		}

		console.log('IndexDB Empty Returning Fetch');
		return fetch(requestJSON).then(function(res) {
			let indexValue = res.clone();
			
			// Put JSON in indexedDB
			indexValue.json().then(function(json) {
				idbRestaurants.set('restaurants-json', json);
			});
			
			return res;
		});
	});
}
