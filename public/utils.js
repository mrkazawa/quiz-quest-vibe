// Utility functions for the quiz application

/**
 * Updates the header title based on the current screen
 * @param {string} screenName - The name of the current screen
 */
function updateHeaderTitle(screenName) {
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) {
    headerTitle.textContent = screenName;
  }
}

// Export utility functions if using modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    updateHeaderTitle
  };
}
