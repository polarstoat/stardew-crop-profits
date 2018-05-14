/**
 * A simple way to GET some JSON. Stolen from http://youmightnotneedjquery.com/#json and then updated to use promises and arrow functions
 * @async
 * @see http://youmightnotneedjquery.com/#json
 * @param  {string} url The URL the JSON you want is at
 * @return {Promise<object>}     The JSON you want, already converted into a JS object
 */
function getJSON(url) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('GET', url, true);

    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        let data;

        try {
          data = JSON.parse(request.response);
        } catch (e) {
          reject(e);
        }

        resolve(data);
      } else {
        // We reached our target server, but it returned an error
        reject(new Error(`Failed to load resource '${url}': the server responded with a status of ${request.status}`));
      }
    });

    request.addEventListener('error', () => {
      // There was a connection error of some sort
      reject(new Error('There was a connection error of some sort'));
    });

    request.send();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // do work
  getJSON('js/crops.json').then(console.log);
});
