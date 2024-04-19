'use strict';

//  Class representing a workout, either running or cycling.
class Workout {
  /**
   * Create a workout.
   * @param {Number[]} coords - The coordinates of the workout [lat, lng].
   * @param {Number} distance - The distance covered in the workout, in kilometers.
   * @param {Number} duration - The duration of the workout, in minutes.
   */
  constructor(coords, distance, duration) {
    this.date = new Date();
    this.id = (Date.now() + '').slice(-10);
    this.clicks = 0;
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
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
  /**
   * Create a running workout.
   * @param {Number[]} coords - The coordinates of the workout [lat, lng].
   * @param {Number} distance - The distance covered in the workout, in kilometers.
   * @param {Number} duration - The duration of the workout, in minutes.
   * @param {Number} cadence - The cadence of the workout, in steps per minute.
   */
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.type = 'running';
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
class Cycling extends Workout {
  /**
   * Create a cycling workout.
   * @param {Number[]} coords - The coordinates of the workout [lat, lng].
   * @param {Number} distance - The distance covered in the workout, in kilometers.
   * @param {Number} duration - The duration of the workout, in minutes.
   * @param {Number} elevationGain - The elevation gain of the workout, in meters.
   */
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.type = 'cycling';
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
/** @type {HTMLElement|null } */
const form = document.querySelector('.form');

/** @type {HTMLElement|null } */
const containerWorkouts = document.querySelector('.workouts');

//----- Inputs
/** @type {HTMLInputElement|null} */
const inputType = document.querySelector('.form__input--type');
/** @type {HTMLInputElement|null} */
const inputDistance = document.querySelector('.form__input--distance');
/** @type {HTMLInputElement|null} */
const inputDuration = document.querySelector('.form__input--duration');
/** @type {HTMLInputElement|null} */
const inputCadence = document.querySelector('.form__input--cadence');
/** @type {HTMLInputElement|null} */
const inputElevation = document.querySelector('.form__input--elevation');

// ----- Buttons
/** @type {HTMLElement|null } */
const workoutsClearAllBtn = document.querySelector('.workouts__clear--btn');
/** @type {HTMLElement|null } */
const workoutsSortBtn = document.querySelector('.workouts__sort--btn');

// ----- Messages
/** @type {HTMLElement|null } */
const locationErrorMessage = document.querySelector('.location-error');
/** @type {HTMLElement|null } */
const howToUseMessage = document.querySelector('.workouts__message');

// ----- Temperature
const temperature = document.querySelector('.temp');

// const workoutsErrormessage = document.querySelector('.workouts__message-error')

class App {
  /**@type {Object} - This is Leaflet map */
  #map;
  #mapZoomLevel = 13;
  /** @type {Object} - here are assigned events that map gives us*/
  #mapEvent;
  /** @type {Array} - workouts  */
  #workouts = [];
  /** @type {Array} - workouts  */
  #markers = [];
  /** @type {Boolean} */
  #position = false;

  constructor() {
    // Get user's position

    const checkLocation = async () => {
      try {
        await this._getPosition();

        // Get data from local storage
        this._getLocalStorage();
        // Attach event handlers
        form?.addEventListener('submit', this._newWorkout.bind(this));
        inputType?.addEventListener('change', this._toggleElevationField);
        containerWorkouts?.addEventListener(
          'click',
          this._moveToPopup.bind(this)
        );

        // Delete all workout with clear all btn
        workoutsClearAllBtn?.addEventListener(
          'click',
          this._removeAllWorkout.bind(this)
        );
        //delete form and workout with X icon
        containerWorkouts?.addEventListener('click', e => {
          if (e.target?.classList.contains('form__icon--closeFrom'))
            this._hideForm();
          if (e.target?.classList.contains('workout__icon--closeWorkout'))
            this._removeWorkout(e);
          else this._moveToPopup.call(this, e);
        });

        // Sort workouts
        workoutsSortBtn?.addEventListener(
          'click',
          this._sortWorkouts.bind(this)
        );
      } catch (err) {
        console.error('Error getting geolocation:', err);
        return;
      }
    };
    checkLocation();
  }

  // _getPosition() {
  //   if (navigator.geolocation)
  //     navigator.geolocation.getCurrentPosition(
  //       position => {
  //         const { latitude } = position.coords;
  //         const { longitude } = position.coords;
  //         this._loadMap(latitude, longitude);
  //         this._weatherFetch(latitude, longitude);
  //         this.#position = true;
  //       },
  //       err => {
  //         // alert('Could not get your position');
  //         locationErrorMessage.classList.remove('error-message--hidden');
  //         console.error(`Error getting Location`, err);
  //       }
  //     );
  // }
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
            this.#position = true;
            resolve(null);
          },
          err => {
            // alert('Could not get your position');
            locationErrorMessage?.classList.remove('error-message--hidden');
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
   * Load the map with the given latitude and longitude.
   * @private
   * @param {Number} latitude - The latitude of the map center.
   * @param {Number} longitude - The longitude of the map center.
   */
  _loadMap(latitude, longitude) {
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    console.log(this.#map);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // Take lat and long while click in map
    this.#map.on('click', e => {
      let coord = e.latlng;
      let latitude = coord.lat;
      let longitude = coord.lng;

      this._weatherFetch(latitude, longitude);
    });

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
      console.log(work);
    });
    // dispaly instructions message && Check if Activities is clear
    if (this.#workouts.length) return;
    this._showInstructions();
  }

  /**
   * Fetch weather data for the given latitude and longitude.
   * @private
   * @param {Number} latitude - The latitude for weather data.
   * @param {Number} longitude - The longitude for weather data.
   */
  _weatherFetch(latitude, longitude) {
    // weather fetch
    const KEY = `e4cfdef243323d4fa8cde9c5e81f4901`;

    const weatherFetch = async function () {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${KEY}`
        );

        if (!res.ok) {
          throw new Error('Weather data request failed');
        }

        const data = await res.json();

        const { temp } = data.main;
        if (temperature) temperature.textContent = `${temp} °C`;
      } catch (err) {
        // Handle the error
        console.error('Error fetching weather data:', err);
      }
    };
    // Call
    weatherFetch();
  }

  _showInstructions() {
    howToUseMessage?.classList.remove('workouts__message--hidden');
  }

  _hideInstructions() {
    howToUseMessage?.classList.add('workouts__message--hidden');
  }

  /**
   * Show the form for adding a new workout.
   * @param {Object} mapE - The map event.
   */
  _showForm(mapE) {
    // Get access to map events
    this.#mapEvent = mapE;
    if (form) {
      // Show Form
      form.classList.remove('hidden');
      if (inputDistance) {
        // Focus Distance input field
        inputDistance.focus();
      }
    }

    this._hideInstructions();
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

      // Display instructions message if no workouts
      if (this.#workouts.length === 0) {
        this._showInstructions();
      }
    }
  }

  // Wokrs when Workout Tiye changes
  _toggleElevationField() {
    if (inputElevation)
      inputElevation
        .closest('.form__row')
        ?.classList.toggle('form__row--hidden');

    if (inputCadence)
      inputCadence.closest('.form__row')?.classList.toggle('form__row--hidden');
  }

  // _newWorkout(e) {
  //   const validInputs = (...inputs) =>
  //     inputs.every(inp => Number.isFinite(inp));
  //   const allPositive = (...inputs) => inputs.every(inp => inp > 0);

  //   e.preventDefault();

  //   // Get data from form
  //   const type = inputType.value;
  //   const distance = +inputDistance.value;
  //   const duration = +inputDuration.value;
  //   const { lat, lng } = this.#mapEvent.latlng;
  //   let workout;

  //   // If workout running, create running object
  //   if (type === 'running') {
  //     const cadence = +inputCadence.value;

  //     // Check if data is valid
  //     if (
  //       !validInputs(distance, duration, cadence) ||
  //       !allPositive(distance, duration, cadence)
  //     )
  //       return alert(
  //         `❗Error❗\n 1. Inputs have to be positive numbers\n 2. Inputs have to be filled!`
  //       );

  //     workout = new Running([lat, lng], distance, duration, cadence);
  //   }

  //   // If workout cycling, create cycling object
  //   if (type === 'cycling') {
  //     const elevation = +inputElevation.value;
  //     // Check if data is valid
  //     if (
  //       !validInputs(distance, duration, elevation) ||
  //       !allPositive(distance, duration, elevation)
  //     )
  //       return alert(
  //         `❗Error❗\n 1. Inputs have to be positive numbers\n 2. Inputs have to be filled!`
  //       );

  //     workout = new Cycling([lat, lng], distance, duration, elevation);
  //   }

  //   // Add new object to workout array
  //   this.#workouts.push(workout);

  //   // Render workout on map as marker
  //   this._renderWorkoutMarker(workout);

  //   // Render workout on list
  //   this._renderWorkout(workout);

  //   // Hide form + clear input fields
  //   this._hideForm();

  //   // Set local storage to all workouts
  //   this._setLocalStorage();
  // }
  /**
   * Handle the form submission to add a new workout.
   * @param {Event} e - The form submission event.
   */
  _newWorkout(e) {
    // Prevent default form submission behavior
    e.preventDefault();
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

    // If the workout type is 'running', create a new Running object
    if (type === 'running') {
      const cadence = inputCadence ? +inputCadence.value : NaN;

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        alert(
          `❗Error❗\n 1. Inputs have to be positive numbers\n 2. Inputs have to be filled!`
        );
        return;
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If the workout type is 'cycling', create a new Cycling object
    else if (type === 'cycling') {
      const elevation = inputElevation ? +inputElevation.value : NaN;

      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      ) {
        alert(
          `❗Error❗\n 1. Inputs have to be positive numbers\n 2. Inputs have to be filled!`
        );
        return;
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add the new workout to the workouts array
    this.#workouts.push(workout);
    console.log(this.#workouts);
    // Render the new workout on the map
    this._renderWorkoutMarker(workout);

    // Render the new workout in the workout list
    this._renderWorkout(workout);

    // Hide the form and clear input fields
    this._hideForm();

    // Save the workouts to local storage
    this._setLocalStorage();
  }

  /**
   *
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
    this.#markers.push(marker);

    console.log(`marker: ${marker}`);
  }
  /**
   *
   * @param {Object} workout
   */
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <ion-icon
            class="workout__icon--closeWorkout icon__close"
            name="close-outline"
          ></ion-icon>
        <h2 class="workout__title">${workout.description} </h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form?.insertAdjacentHTML('afterend', html);
  }

  /**
   *
   * @param {*} e - event
   */
  _removeWorkout(e) {
    const parentEl = e.target.parentElement;
    const parentElId = parentEl.getAttribute('data-id');

    // Find the index of the workout with the parentElId ID
    const indexToRemove = this.#workouts.findIndex(
      workout => workout.id === parentElId
    );

    if (indexToRemove !== -1 || indexToRemove === 0) {
      // Remove the workout from the workouts array
      this.#workouts.splice(indexToRemove, 1);
      // Remove the workout marker on the map
      this.#markers[indexToRemove].remove();
      this.#markers.splice(indexToRemove, 1);

      // Remove the workout element from the list
      parentEl.remove();

      // Remove the workout from Local Storage
      const data = JSON.parse(localStorage.getItem('workouts'));
      data?.splice(indexToRemove, 1);
      this._setLocalStorage();

      // dispaly instructions message && Check if Activities is clear
      if (this.#workouts.length || !form.classList.contains('hidden')) return;
      this._showInstructions();
    }
  }

  _removeAllWorkout() {
    const el = document.querySelectorAll('.workout');
    if (el) el.forEach(workout => workout.remove());

    this.#workouts.splice(0, this.#workouts.length);

    this.#markers.map(marker => marker.remove());
    this.#markers.splice(0, this.#markers.length);

    localStorage.removeItem('workouts');

    // dispaly instructions message && Check if Activities is clear
    if (this.#workouts.length || !form.classList.contains('hidden')) return;
    this._showInstructions();
  }

  _sortWorkouts() {
    const el = document.querySelectorAll('.workout');

    el.forEach(workout => workout.remove());

    const sorted = this.#workouts
      .slice()
      .sort((a, b) => a.distance - b.distance);
    sorted.map(sortedWorkout => this._renderWorkout(sortedWorkout));
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 0.5,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

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

//Create an instance of the App class
const app = new App();
