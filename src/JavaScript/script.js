'use strict';

//  Class representing a workout, either running or cycling.
class Workout {
  /** @type {Date} */
  date = new Date();

  /** @type {String} */
  id = (Date.now() + '').slice(-10);

  /**
   * Create a workout.
   * @param {Number[]} coords - The coordinates of the workout [lat, lng].
   * @param {Number} distance - The distance covered in the workout, in kilometers.
   * @param {Number} duration - The duration of the workout, in minutes.
   */
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  /**
   * Set the description of the workout based on the type and date.
   * @param {String} type - workout Type
   */
  _setDescription(type) {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${type[0].toUpperCase()}${type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

/**
 * Class representing a running workout, a type of workout.
 * @extends Workout
 */
class Running extends Workout {
  /** @type {String} */
  type = 'running';

  /**
   * Create a running workout.
   * @param {Number[]} coords - The coordinates of the workout [lat, lng].
   * @param {Number} distance - The distance covered in the workout, in kilometers.
   * @param {Number} duration - The duration of the workout, in minutes.
   * @param {Number} cadence - The cadence of the workout, in steps per minute.
   */
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription(this.type);
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

/**
 * Class representing a Cycling workout, a type of Cycling.
 * @extends Workout
 */

class Cycling extends Workout {
  /** @type {String} */
  type = 'cycling';

  /**
   * Create a cycling workout.
   * @param {Number[]} coords - The coordinates of the workout [lat, lng].
   * @param {Number} distance - The distance covered in the workout, in kilometers.
   * @param {Number} duration - The duration of the workout, in minutes.
   * @param {Number} elevationGain - The elevation gain of the workout, in meters.
   */
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription(this.type);
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////
// APPLICATION ARCHITECTURE
// ----- Elements
/** @type {HTMLElement|null } */
const sidebarButtonBox = qs('.sidebar-row__buttons');
const weatherBox = qs('.weatherInfo');

/** @type {HTMLElement|null } */
const form = qs('.form');

/** @type {HTMLElement|null } */
const containerWorkouts = qs('.workouts');

//----- Inputs
/** @type {HTMLInputElement|null} */
const inputType = qs('.form__input--type');
/** @type {HTMLInputElement|null} */
const inputDistance = qs('.form__input--distance');
/** @type {HTMLInputElement|null} */
const inputDuration = qs('.form__input--duration');
/** @type {HTMLInputElement|null} */
const inputCadence = qs('.form__input--cadence');
/** @type {HTMLInputElement|null} */
const inputElevation = qs('.form__input--elevation');

// ----- Buttons
/** @type {HTMLElement|null } */
const workoutsClearAllBtn = qs('.workouts__clear--btn');
/** @type {HTMLElement|null } */
const workoutsSortBtn = qs('.workouts__sort--btn');

// ----- Messages
/** @type {HTMLElement|null } */
const messageBox = qs('.messages');

class App {
  /** @type {Object} */
  #map;
  /** @type {Number} */
  #mapZoomLevel = 13;
  /** @type {Object} - here are assigned events that map gives us*/
  #mapEvent;
  /** @type {Array} - workouts  */
  #workouts = [];
  /** @type {Object} - workouts  */
  #markers = {};

  constructor() {
    // Get user's position
    this._getPosition();
    if (!localStorage.getItem('workouts')) {
      this._renderMessage(
        messageBox,
        false,
        'Welcome click on the map and plan your activities 😊'
      );
      countdown(5, () => {
        messageBox?.remove();
      });
    }

    // Get data from local storage
    this._getWorkoutsFromLocalStorage();

    // Attach event handlers

    sidebarButtonBox?.addEventListener('click', e => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      if (target?.classList.contains('btn-clearAll')) this._clearAllWorkouts();
      if (target?.classList.contains('btn-sort')) this._sortWorkouts();
    });

    form?.addEventListener('submit', this._newWorkout.bind(this));
    inputType?.addEventListener('change', this._toggleElevationField);
    containerWorkouts?.addEventListener('click', e => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      this._moveToPopup(e);
      if (target?.classList.contains('closeForm')) this._hideForm();
      if (target?.classList.contains('closeWorkout')) this._removeWorkout(e);
    });
  }

  // =======================================
  // ========// Location & Weather //======
  /**
   * Get the user's current position.
   * @private
   * @returns {Promise} A promise that resolves when the position is retrieved.
   */
  async _getPosition() {
    // Get the user's current position using the Geolocation API
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            const { latitude, longitude } = position.coords;
            // Load the map and fetch weather data
            this._loadMap(latitude, longitude);
            this._weatherFetch(latitude, longitude);
            resolve(null);
          },
          err => {
            this._renderMessage(
              messageBox,
              true,
              'Could not get your position 📍'
            );
            countdown(5, () => {
              messageBox?.remove();
            });
            // locationErrorMessage?.classList.remove('error-message--hidden');
            console.error(`Error getting Location`, err);
            reject(err);
          }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  }
  /**
   * @param {Number} latitude
   * @param {Number} longitude
   */
  _loadMap(latitude, longitude) {
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Check if there are any markers by checking if there is any workout
    if (localStorage.hasOwnProperty('workouts')) {
      const workouts = this._getLocalStorage('workouts');

      if (workouts && workouts.length !== 0) {
        const data = workouts.map(workout => workout.coords);

        // Extract latitudes and longitudes from data
        const latLngs = data.map(coords => L.latLng(coords[0], coords[1]));

        // Create a Leaflet LatLngBounds object
        const bounds = L.latLngBounds(latLngs);

        this.#map.fitBounds(bounds, { padding: [70, 70] });
      }
    }

    // Handling clicks on map
    // e - object
    this.#map.on('click', e => {
      let { lat, lng } = e.latlng;
      this.#mapEvent = e;
      this._showForm();
      this._weatherFetch(lat, lng);
    });

    // Render Marker
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  /**
   * Fetch weather data for the given latitude and longitude.
   * @private
   * @param {Number} latitude - The latitude for weather data.
   * @param {Number} longitude - The longitude for weather data.
   */
  _weatherFetch(latitude, longitude) {
    const KEY = 'e4cfdef243323d4fa8cde9c5e81f4901';

    const weatherFetch = async function () {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${KEY}`
        );

        if (!res.ok) {
          throw new Error('Weather data request failed');
        }

        const data = await res.json();
        const {
          main: { temp },
          weather,
        } = data;

        // Update the temperature display
        const weatherIconPath = `http://openweathermap.org/img/wn/${weather[0].icon}.png`;
        const weatherIconAlt = weather[0].description;
        renderHtml(
          weatherBox,
          WeatherComponent(weatherIconPath, weatherIconAlt, temp)
        );
      } catch (err) {
        // Handle the error
        console.error('Error fetching weather data:', err);
      }
    };
    weatherFetch();
  }

  // ===================================
  // ========// FORM Releated //======

  _showForm() {
    form?.classList.remove('hidden');
    inputDistance?.focus();
  }

  _hideForm() {
    // Empty inputs
    if (inputDistance && inputDuration && inputCadence && inputElevation) {
      inputDistance.value =
        inputDuration.value =
        inputCadence.value =
        inputElevation.value =
          '';
    }

    if (form) {
      form.style.display = 'none';
      form.classList.add('hidden');
      setTimeout(() => (form.style.display = 'grid'), 100);
    }
  }

  _toggleElevationField() {
    inputElevation
      ?.closest('.form__row')
      ?.classList.toggle('form__row--hidden');

    inputCadence?.closest('.form__row')?.classList.toggle('form__row--hidden');
  }

  // ===================================
  // ========// RENDER WORKOUT //======

  /**
   * Handle the form submission to add a new workout.
   * @param {Event} e - The form submission event.
   */
  _newWorkout(e) {
    e.preventDefault();

    // Get data from form
    /**
     *  Function to check if all inputs are valid numbers
     * @param  {Number[]} inputs
     * @returns {Boolean}
     */
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    /**
     * Function to check if all inputs are positive numbers
     * @param  {Number[]} inputs
     * @returns {Boolean}
     */
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from the form inputs
    const type = inputType?.value;
    const distance = inputDistance ? +inputDistance.value : NaN;
    const duration = inputDuration ? +inputDuration.value : NaN;

    const { lat, lng } = this.#mapEvent.latlng;
    /** @type {Object} */
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = inputCadence ? +inputCadence.value : NaN;

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert(
          `❗Error❗\n 1. Inputs have to be positive numbers\n 2. Inputs have to be filled!`
        );
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = inputElevation ? +inputElevation.value : NaN;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert(
          `❗Error❗\n 1. Inputs have to be positive numbers\n 2. Inputs have to be filled!`
        );

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage('workouts', this.#workouts);
  }

  // ===================================
  // ========// RENDER MARKER //=======

  /**
   * @param {Object} workout
   */
  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    // Store the marker reference
    this.#markers[workout.id] = marker;

    const markersLatLng = Object.values(this.#markers).map(el => {
      const { lat, lng } = el._latlng;
      return { lat, lng };
    });
  }

  /**
   * @param {String| null} workoutId - If specified Deletes specific one
   * @param {boolean} clearAll - Default = false
   */

  // ========  Manipulations =========

  // ===========================================
  // ========// MARKER Manipulation //========

  _deleteWorkoutMarker(workoutId, clearAll = false) {
    if (workoutId) {
      const marker = this.#markers[workoutId];
      if (marker) {
        marker.remove();
        delete this.#markers[workoutId];
      }
    }
    if (clearAll) {
      // Delete all markers
      Object.values(this.#markers).forEach(marker => {
        marker.remove();
      });
      this.#markers = {}; // Clear the markers object
    }
  }

  // =============================================
  // =======// WORKOUT Manipulation //==========

  /**
   * Render new rowkout
   * @param {Object} workout
   */
  _renderWorkout(workout) {
    const workoutElement = WorkoutComponent(workout);
    insertHtml(form, 'afterend', workoutElement);
  }
  /**
   * Delete Specific Workout
   * @param {*} e - event
   */
  _removeWorkout(e) {
    const parentEl = e.target.closest('.workout');
    if (!parentEl) return; // Ensure a valid parent element is found

    const workoutId = parentEl.dataset.id;
    if (!workoutId) return; // Ensure a valid workout ID is found

    // Remove the workout from the #workouts array
    this.#workouts = this.#workouts.filter(workout => workout.id !== workoutId);

    // Clear the existing workout elements from the DOM
    this._clearWorkoutList();

    // Re-render the updated list of workouts
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });

    // Remove makrer
    this._deleteWorkoutMarker(workoutId);

    // Update LocalStorage With new changes
    this._setLocalStorage('workouts', this.#workouts);
  }

  // Delete All Workout
  _clearAllWorkouts() {
    // Back to initial value
    this.#workouts = [];
    // this.#workouts.splice(0, this.#workouts.length);
    // Clear dom
    this._clearWorkoutList();

    // Clear all markers
    this._deleteWorkoutMarker(null, true);
    // Update Local Storage
    this._setLocalStorage('workouts', this.#workouts);
  }

  _sortWorkouts() {
    // Clear dom
    this._clearWorkoutList();

    // Sort Workouts and Display again
    const sorted = this.#workouts
      .slice()
      .sort((a, b) => a.distance - b.distance);
    sorted.map(sortedWorkout => this._renderWorkout(sortedWorkout));
  }

  _clearWorkoutList() {
    const workoutElements = qsAll('.workout');
    workoutElements.forEach(element => element.remove());
  }

  /**
   * Handle the Workout Click to Display map at workout place .
   * @param {Event} e - The form submission event.
   */
  _moveToPopup(e) {
    // Not allow movement before map loads
    if (!this.#map) return;
    // Not allow movement if icon is clicked
    const target = e.target;
    if (!(target instanceof Element) || !target) return;

    if (target?.classList.contains('closeWorkout')) return;

    /** @type {HTMLElement|Null} */
    const workoutEl = target.closest('.workout');

    if (!workoutEl) return;

    const workoutId = workoutEl?.dataset.id;
    if (!workoutId) return;

    const workout = this.#workouts.find(work => work.id === workoutId);

    if (!workout) return;

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 0.5,
      },
    });
  }

  // ======================================
  // ========// Message //===============
  /**
   *
   * @param {HTMLElement|null} element - Place where you render it
   * @param {Boolean} isError
   * @param {String} message
   */
  _renderMessage(element, isError = false, message) {
    renderHtml(element, Message(isError, message));
  }

  // ======================================
  // ========// Local Storage //=========
  /**
   *
   * @param {String} key  - The key to set in localStorage
   * @param {Object} value - The object to be placed in the localStorage
   */
  _setLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  /**
   * Retrieve and parse data from localStorage
   * @param {String} key - The key to get from localStorage
   * @returns {Array|null} The parsed array data,
   * @throws {Error} If the data cannot be parsed as JSON
   */
  _getLocalStorage(key) {
    const stringData = localStorage.getItem(key);
    if (!stringData) {
      throw new Error(`There is no ${key} in LocalStorage`);
    }

    if (!isValidJSON(stringData)) {
      console.warn(`Data for ${key} is not valid JSON`);
      return null;
    }

    try {
      const parsedData = JSON.parse(stringData);
      if (!Array.isArray(parsedData)) {
        throw new Error(`Data for ${key} is not an array`);
      }
      return parsedData;
    } catch (error) {
      console.error(`Error parsing data for ${key}:`, error);
      throw error;
    }
  }

  _getWorkoutsFromLocalStorage() {
    if (!localStorage.hasOwnProperty('workouts')) return;
    const data = this._getLocalStorage('workouts');

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
