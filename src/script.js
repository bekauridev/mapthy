'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {

    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]
      } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const workoutsClearAllBtn = document.querySelector('.workouts__clear--btn')
const workoutsSortBtn = document.querySelector('.workouts__sort--btn')
const locationErrorMessage = document.querySelector('.location-error')
const howToUseMessage = document.querySelector('.workouts__message')

const temperature = document.querySelector('.temp')

// const workoutsErrormessage = document.querySelector('.workouts__message-error')

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = []

  constructor() {
    // Get user's position
    this._getPosition();
    // localStorage.removeItem('workouts');

    // Get data from local storage
    this._getLocalStorage();


    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    // Delete all workout with clear all btn
    workoutsClearAllBtn.addEventListener('click', this._removeAllWorkout.bind(this))
    //delete form and workout with X icon
    containerWorkouts.addEventListener('click', (e) => {
      if (e.target.classList.contains('form__icon--closeFrom')) this._hideForm();
      if (e.target.classList.contains('workout__icon--closeWorkout')) this._removeWorkout(e)
      else this._moveToPopup.call(this, e)
    });


    // Sort workouts
    workoutsSortBtn.addEventListener('click', this._sortWorkouts.bind(this))
  }


  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude } = position.coords;
          const { longitude } = position.coords;
          this._loadMap(latitude, longitude);
          this._weatherFetch(latitude, longitude);
        },
        (err) => {
          // alert('Could not get your position');
          locationErrorMessage.classList.remove('error-message--hidden')
          console.error(`Error getting Location`, err)
        }
      );
  }
  _loadMap(latitude, longitude) {

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });

    // dispaly instructions message && Check if Activities is clear
    if (this.#workouts.length) return
    this._showInstructions()
  }

  _weatherFetch(latitude, longitude) {
    // weather fetch
    const weatherFetch = async function () {
      try {
        const res = await fetch(`https://api.weatherbit.io/v2.0/current?lat=${latitude}&lon=${longitude}&key=7a67b4d82bdc4ed0b22c7669565bca63&include=minutely`);

        if (!res.ok) {
          throw new Error('Weather data request failed');
        }

        const data = await res.json();
        const [temp] = data.data;
        temperature.textContent = `${temp.temp} °C`;
      } catch (err) {
        // Handle the error
        console.error('Error fetching weather data:', err);
      }
    };
    // Call
    weatherFetch();
  }



  _showInstructions() {
    howToUseMessage.classList.remove('workouts__message--hidden')
  }

  _hideInstructions() {
    howToUseMessage.classList.add('workouts__message--hidden')

  }


  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();

    this._hideInstructions()
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
      '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 100);

    // dispaly instructions message && Check if Activities is clear
    if (this.#workouts.length) return
    this._showInstructions()
  }



  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) return alert(`❗Error❗\n 1. Inputs have to be positive numbers\n 2. Inputs have to be filled!`);

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      ) return alert(`❗Error❗\n 1. Inputs have to be positive numbers\n 2. Inputs have to be filled!`);

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
    this._setLocalStorage();

  }



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
    this.#markers.push(marker)

  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <ion-icon
            class="workout__icon--closeWorkout icon__close"
            name="close-outline"
          ></ion-icon>
        <h2 class="workout__title">${workout.description} </h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
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

    form.insertAdjacentHTML('afterend', html);
  }

  _removeWorkout(e) {
    const parentEl = e.target.parentElement;
    const parentElId = parentEl.getAttribute('data-id');

    // Find the index of the workout with the parentElId ID
    const indexToRemove = this.#workouts.findIndex(workout => workout.id === parentElId);

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
      data.splice(indexToRemove, 1);
      this._setLocalStorage();

      // dispaly instructions message && Check if Activities is clear
      if (this.#workouts.length || !form.classList.contains('hidden')) return
      this._showInstructions()


    }
  }

  _removeAllWorkout() {
    const el = document.querySelectorAll('.workout')
    if (el) el.forEach(workout => workout.remove())

    this.#workouts.splice(0, this.#workouts.length)


    this.#markers.map(marker => marker.remove());
    this.#markers.splice(0, this.#markers.length)


    localStorage.removeItem('workouts');

    // dispaly instructions message && Check if Activities is clear
    if (this.#workouts.length || !form.classList.contains('hidden')) return
    this._showInstructions()
  }

  _sortWorkouts() {
    const el = document.querySelectorAll('.workout')

    el.forEach(workout => workout.remove())

    const sorted = this.#workouts.slice().sort((a, b) => a.distance - b.distance)
    sorted.map(sortedWorkout => this._renderWorkout(sortedWorkout))
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

const app = new App();


