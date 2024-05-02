/**
 * @typedef { "close"|"close-outline"|"trash-outline"} IconCloseName
 */

/**
 * Generates HTML for an icon.
 * @param {Object} options - The options for the icon.
 * @param {String[]} options.divClasses - The classes for the icon's container div.
 * @param {IconCloseName} options.iconName - The name of the icon.
 * @param {String[]} [options.iconClasses=[]] - The classes for the icon element.
 * @returns {String} The HTML string for the icon.
 */
function Icon({ divClasses, iconName, iconClasses }) {
  return /*html */ `
   <div class="${divClasses.join(' ')}">
      <ion-icon class="${iconClasses?.join(' ')}" name="${iconName}"></ion-icon>
  </div> `;
}

/**
 * Generates HTML for a workout component.
 * @param {Object} workout - The workout data.
 * @param {String} workout.type - The type of workout (e.g., "running" or "cycling").
 * @param {String} workout.id - The ID of the workout.
 * @param {String} workout.description - The description of the workout.
 * @param {Number} workout.distance - The distance of the workout.
 * @param {Number} workout.duration - The duration of the workout.
 * @param {Number} workout.pace - The pace of the workout.
 * @param {Number} workout.speed - The speed of the workout.
 * @param {Number} workout.cadence - The cadence of the workout.
 * @param {Number} workout.elevationGain - The elevation gain of the workout.
 * @returns {String} The HTML string for the workout component.
 */

// running
// cycling
function WorkoutComponent(workout) {
  const {
    type,
    id,
    description,
    distance,
    duration,
    pace,
    speed,
    cadence,
    elevationGain,
  } = workout;

  return /*html*/ ` <li class="workout workout--${type}" data-id="${id}">

    ${Icon({
      divClasses: ['close-iconBox'],
      iconName: 'close-outline',
      iconClasses: ['close-icon', 'closeWorkout'],
    })}

  <h2 class="workout__title">${description}</h2>
  <div class="workout__details">
    <span class="workout__icon">
      ${type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}
    </span>
    <span class="workout__value">${distance}</span>
    <span class="workout__unit">km</span>
  </div>

  <div class="workout__details">
    <span class="workout__icon">⏱</span>
    <span class="workout__value">${duration}</span>
    <span class="workout__unit">min</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${
      type === 'running' ? pace?.toFixed(1) : speed.toFixed(1)
    }</span>
    <span class="workout__unit">${type === 'running' ? 'min/km' : 'km/h'}</span>
  </div>
  <div class="workout__details">
      
    <span class="workout__icon">${type === 'running' ? '🦶🏼' : '⛰'}</span>
    <span class="workout__value">${
      type === 'running' ? cadence : elevationGain
    }</span>
    <span class="workout__unit">${type === 'running' ? 'spm' : 'm'}</span>
  </div>
</li>
  `;
}

/**
 * Generates HTML for displaying weather information.
 * @param {string} imgSrc - The URL of the weather icon image.
 * @param {string} imgAlt - The alt text for the weather icon image.
 * @param {number} temp - The temperature value.
 * @returns {string} The HTML string.
 */
function WeatherComponent(imgSrc, imgAlt, temp) {
  return /*html */ `   

    <div class="card weatherInfo-card">
      <div class="weatherInfo-card__iconBox">
        <img class="weatherInfo-card__icon" src=${imgSrc} alt=${imgAlt} />
      </div>
      <div class="weatherInfo-card__tempInfoBox">
        <h3 class="weatherInfo-card__tempInfo">${temp}°C</h3>
      </div>
    </div>
 
`;
}

//

/**
 * Display Message
 * @param {String} message - Message
 * @param {Boolean} isError - indicates is error or not
 * @returns {String}
 */
function Message(isError = false, message) {
  return /*html */ ` 
   <div class="message ${isError ? 'ErrorMessage' : ''} ">
     <p>${message.trim()}</p>
     <div class="timerLine"></div>
  </div>`;
}
