/**
 
 * document.querySelectorAll
 * @param {string} selector - The CSS selector to search for elements.
 * @returns {NodeList} - A list of DOM elements that match the selector.
 */
function qsAll(selector) {
  return document.querySelectorAll(selector);
}

/**
 * document.querySelector
 * @param {string} selector - The CSS selector to search for an element.
 * @returns {HTMLElement | HTMLInputElement | null} - The first DOM element that matches the selector, or null if none is found.
 */
function qs(selector) {
  return document.querySelector(selector);
}
/**
 * insertAdjacentHTML() |
 * Inserts HTML content into a DOM element at the specified location.
 * @param {HTMLElement | null} element - The DOM element to insert content into.
 * @param {InsertPosition} location -The position relative to the element's current content where the new HTML should be inserted.
 * Recommended values: 'beforebegin', 'afterbegin', 'beforeend', 'afterend'.
 * @param {string} content - The HTML content to be inserted.
 */
function insertHtml(element, location, content) {
  element?.insertAdjacentHTML(location, content);
}

/**
 * innerHTML |
 * Replaces the content of a DOM element with the given HTML content.
 * @param {HTMLElement | null} element - The DOM element whose content should be replaced.
 * @param {string} content - The new HTML content for the element.
 */
function renderHtml(element, content) {
  if (element) element.innerHTML = content;
}

/**
 * Checks if a given string is valid JSON.
 * @param {string} jsonString - The string to be checked.
 * @returns {boolean} - Returns true if the string is valid JSON, otherwise false.
 */
function isValidJSON(jsonString) {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Asynchronous countdown function with a callback.
 * @param {number} seconds - The number of seconds for the countdown.
 * @param {Function} callback - The callback function to call when the countdown completes.
 */
async function countdown(seconds, callback) {
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  // Call the callback function if provided
  if (callback && typeof callback === 'function') {
    callback();
  }
}
