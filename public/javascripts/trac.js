/**
 * Handle form submission details.
 *
 * @callback eventCallback Fires on 'DOMContentLoaded'.
 * @param {Object} event The triggered event data.
 */
function formStuff(event) {
  "use strict";

  /**
   * The form to generate Trac reports.
   *
   * @type {Element}
   */
  var form = document.getElementById('search-trac');

  if (form !== null) {
    form.addEventListener('submit', submitHandler);
  }

  /**
   * Provide visual feedback when the form submits.
   *
   * Strive to provide good UX when submitting forms, especially when they take a long time
   * on the round-trip. In this case, provide some visual feedback on the submit button,
   * and a fun little animation on the logo.
   *
   * @uses {Element} form The form for generating reports.
   */
  function provideUXFeedback() {
    var submitButton = form.querySelector('[type="submit"]'),
        logo = document.querySelector('img.logo');

    submitButton.setAttribute('disabled', 'disabled');
    submitButton.value = 'Fetching logs…';
    logo.classList.add('animated');
  }

  /**
   * Sets the revision limit to a sane amount.
   *
   * Default is 400 revisions, but no need to set that if we're asking for less.
   * This checks the two revisions numbers and sets the limit equal to the number
   * we're requesting.
   *
   * @uses {Element} form The form for generating reports.
   */
  function setRevisionLimit() {
    var startRevisionEl = form.querySelector('#startRevision'),
        stopRevisionEl = form.querySelector('#stopRevision'),
        revisionLimitEl = form.querySelector('[name="revisionLimit"]'),
        start, stop;

    if (start = parseInt(startRevisionEl.value, 10) === null) {
      start = 36000;
    }

    if (stop = parseInt(stopRevisionEl.value, 10) === null) {
      stop = 36120;
    }

    revisionLimitEl.value = start - stop;
  }

  /**
   * Intercepts the form submission and takes action before final submission.
   *
   * @param {Object} event The event captured by the listener.
   */
  function submitHandler(event) {
    // Stop!
    event.preventDefault();

    // Collaborate and Listen.
    setRevisionLimit();
    provideUXFeedback();

    // Flow like a harpoon daily and nightly.
    this.submit();
  }
}

/**
 * Wait until the event fires, then take action.
 *
 * @param {String} event The event name to listen for.
 * @param {eventCallback} cb The callback to fire when event fires.
 */
document.addEventListener('DOMContentLoaded', formStuff);
