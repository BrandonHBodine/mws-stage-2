import DBHelper from './dbhelper';
import TryServiceWorker from './all';

const loadGoogleMapsApi = require('load-google-maps-api');

let restaurants;
let neighborhoods;
let cuisines;
let map;
let markers = [];

/**
 * Check for Service Worker in browser
 */

TryServiceWorker();

/**
 * Fetch all neighborhoods and set their HTML.
 */
function fetchNeighborhoods() {
	DBHelper.fetchNeighborhoods((error, neighborhoods) => {
		if (error) {
			// Got an error
			console.error(error);
		} else {
			self.neighborhoods = neighborhoods;
			fillNeighborhoodsHTML();
		}
	});
}

/**
 * Set neighborhoods HTML.
 */
function fillNeighborhoodsHTML(neighborhoods = self.neighborhoods) {
	const select = document.getElementById('neighborhoods-select');
	neighborhoods.forEach(neighborhood => {
		const option = document.createElement('option');
		option.innerHTML = neighborhood;
		option.value = neighborhood;
		select.append(option);
	});
}

/**
 * Fetch all cuisines and set their HTML.
 */
function fetchCuisines() {
	DBHelper.fetchCuisines((error, cuisines) => {
		if (error) {
			// Got an error!
			console.error(error);
		} else {
			self.cuisines = cuisines;
			fillCuisinesHTML();
		}
	});
}

/**
 * Set cuisines HTML.
 */
function fillCuisinesHTML(cuisines = self.cuisines) {
	const select = document.getElementById('cuisines-select');

	cuisines.forEach(cuisine => {
		const option = document.createElement('option');
		option.innerHTML = cuisine;
		option.value = cuisine;
		select.append(option);
	});
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
	let loc = {
		lat: 40.722216,
		lng: -73.987501
	};
	self.map = new google.maps.Map(document.getElementById('map'), {
		zoom: 12,
		center: loc,
		scrollwheel: false
	});
	updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
function updateRestaurants() {
	const cSelect = document.getElementById('cuisines-select');
	const nSelect = document.getElementById('neighborhoods-select');

	const cIndex = cSelect.selectedIndex;
	const nIndex = nSelect.selectedIndex;

	const cuisine = cSelect[cIndex].value;
	const neighborhood = nSelect[nIndex].value;

	DBHelper.fetchRestaurantByCuisineAndNeighborhood(
		cuisine,
		neighborhood,
		(error, restaurants) => {
			if (error) {
				// Got an error!
				console.error(error);
			} else {
				resetRestaurants(restaurants);
				fillRestaurantsHTML();
			}
		}
	);
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
function resetRestaurants(restaurants) {
	// Remove all restaurants
	self.restaurants = [];
	const ul = document.getElementById('restaurants-list');
	ul.innerHTML = '';

	// Remove all map markers
	if (self.markers && self.markers.length > 0) {
		self.markers.forEach(m => m.setMap(null));
	}

	self.markers = [];
	self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */

function fillRestaurantsHTML(restaurants = self.restaurants) {
	const ul = document.getElementById('restaurants-list');
	restaurants.forEach(restaurant => {
		ul.append(createRestaurantHTML(restaurant));
	});
	addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
function createRestaurantHTML(restaurant) {
	const li = document.createElement('li');

	const image = document.createElement('img');

	image.className = 'restaurant-img';
	image.src = DBHelper.imageUrlForRestaurant(restaurant);
	image.setAttribute('alt', restaurant.name);
	li.append(image);

	const section = document.createElement('section');
	li.append(section);

	const name = document.createElement('h1');
	name.innerHTML = restaurant.name;
	section.append(name);

	const neighborhood = document.createElement('p');
	neighborhood.innerHTML = restaurant.neighborhood;
	section.append(neighborhood);

	const address = document.createElement('p');
	address.innerHTML = restaurant.address;
	section.append(address);

	const more = document.createElement('a');
	const button = document.createElement('button');
	button.innerHTML = 'View Details';
	button.setAttribute('tabindex', '-1');
	more.href = DBHelper.urlForRestaurant(restaurant);
	more.append(button);
	section.append(more);

	return li;
}

/**
 * Add markers for current restaurants to the map.
 */
function addMarkersToMap(restaurants = self.restaurants) {
	restaurants.forEach(restaurant => {
		// Add marker to the map
		const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
		google.maps.event.addListener(marker, 'click', () => {
			window.location.href = marker.url;
		});
		self.markers.push(marker);
	});
}

/**
 * Get the google maps API stored in a promise
 *
 */
loadGoogleMapsApi({ key: 'AIzaSyDEHTLqQlbIc4-odc2DnMiEF2uF3arBz4s' }).then(
	() => {
		window.initMap();
	}
);

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', event => {
	fetchNeighborhoods();
	fetchCuisines();

	// Attach event listners
	document
		.getElementById('cuisines-select')
		.addEventListener('change', updateRestaurants);
	document
		.getElementById('neighborhoods-select')
		.addEventListener('change', updateRestaurants);
});
