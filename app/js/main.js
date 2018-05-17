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

function init() {
  const SEASONS = ['spring', 'summer', 'fall', 'winter'];
  const SEASON_LENGTH = 28;

  const crops = [];
  const date = {
    day: 1,
    season: 'spring',
    year: 1,
    timestamp: 0,
  };

  function cheapestSeedPrice(seed) {
    let cheapest = Infinity;

    Object.keys(seed.vendor).forEach((vendor, i, vendors) => {
      // If the seed is only available from the Traveling Cart
      if (vendors.length === 1 && vendor === 'travelingCart') {
        // If the seed has a normal price, use that
        if (typeof seed.vendor[vendor].price !== 'undefined') cheapest = seed.vendor[vendor].price;
        // Otherwise use the average (already calculated in parseCropData) of the min and max price
        else cheapest = seed.vendor[vendor].avgPrice;
      } else if (seed.vendor[vendor].price < cheapest) cheapest = seed.vendor[vendor].price;
    });

    return cheapest;
  }

  function update() {
    const cultivatableCrops = [];

    crops.forEach((crop) => {
      const cleanCrop = crop;

      const dayOfYear = date.timestamp % (SEASON_LENGTH * 4);

      if (dayOfYear < crop.seasonStartDate
        || dayOfYear + crop.daysToGrow >= crop.seasonEndDate) return;

      // TODO: Add 'Agriculturist' profession multiplier to crop.daysToGrow
      const harvests = (crop.daysToRegrow)
        ? Math.ceil((crop.seasonEndDate - dayOfYear - crop.daysToGrow) / crop.daysToRegrow)
        : 1;

      // TODO: Add chance for extra crops multiplier
      // TODO: Add 'Tiller' profession crop value multiplier
      const revenue = (crop.harvest.minHarvest)
        ? crop.sellPrice * harvests * crop.harvest.minHarvest
        : crop.sellPrice * harvests;
      const profit = revenue - cheapestSeedPrice(crop.seed);
      const avgProfit = profit / (((harvests - 1) * crop.daysToRegrow) + crop.daysToGrow);

      cleanCrop.avgProfit = avgProfit;

      cultivatableCrops.push(cleanCrop);
    });

    // Sort crops alphabetically
    cultivatableCrops.sort((a, b) => a.name > b.name);

    // Update DOM
    const tbody = document.getElementById('results').children[1];
    tbody.innerHTML = '';

    cultivatableCrops.forEach((crop) => {
      const tr = document.createElement('tr');
      // TODO: Use CSS to display icon?
      // TODO: Don't hotlink to Stardew Valley Wiki
      tr.innerHTML = `<th scope="row">${crop.name}</th><td><span class="text-nowrap gold"><img src="https://stardewvalleywiki.com/mediawiki/images/thumb/1/10/Gold.png/36px-Gold.png" alt="">${crop.avgProfit.toFixed(2)}g</span></td>`;
      tbody.appendChild(tr);
    });
  }

  /**
   * Converts a season to it's corresponding integer, e.g. 'spring' => 0, 'summer' => 1, etc.
   * Throws if an invalid season is input.
   * @param  {string} str The season to convert
   * @return {number}     Integer representation of the season
   */
  function seasonToInt(str) {
    const index = SEASONS.indexOf(str);
    if (index >= 0) return index;
    throw new Error(`Failed to convert season '${str}' to integer`);
  }

  function parseCropData(cropData) {
    // These are in crops.json but not a directly plantable crop, so ignored
    const CROPS_TO_IGNORE = ['Wild Horseradish', 'Spice Berry', 'Common Mushroom', 'Winter Root'];

    Object.values(cropData).forEach((crop) => {
      const cleanCrop = crop;

      if (CROPS_TO_IGNORE.indexOf(crop.name) > -1) return;

      cleanCrop.daysToGrow = crop.phaseDays.reduce((a, b) => a + b, 0);
      cleanCrop.daysToRegrow = (crop.regrowAfterHarvest === -1) ? 0 : crop.regrowAfterHarvest;

      cleanCrop.seasonStartDate = seasonToInt(crop.seasonsToGrowIn[0]) * SEASON_LENGTH;
      cleanCrop.seasonEndDate =
        cleanCrop.seasonStartDate + (crop.seasonsToGrowIn.length * SEASON_LENGTH);

      const tc = crop.seed.vendor.travelingCart;
      if (tc) cleanCrop.seed.vendor.travelingCart.avgPrice = (tc.minPrice + tc.maxPrice) / 2;

      crops.push(cleanCrop);
    });

    update();
  }

  function dateChanged(evt) {
    const element = evt.target;
    const { id } = element;

    // TODO: Input sanitisation
    if (id === 'day' || id === 'year') {
      date[id] = Number(element.value);
    } else if (id === 'season') {
      date.season = element.value;
    } else {
      throw new Error();
    }

    date.timestamp =
      ((date.year - 1) * (SEASON_LENGTH * 4))
      + (seasonToInt(date.season) * SEASON_LENGTH)
      + (date.day - 1);

    /**
     * If the crop data has been loaded and parsed, then update the display.
     * If it hasn't, once it has loaded an itial update wil be called anyway.
     */
    if (crops.length) update();
  }

  // Add event listeners to date inputs
  document.getElementById('day').addEventListener('input', dateChanged);
  document.getElementById('season').addEventListener('change', dateChanged);
  document.getElementById('year').addEventListener('input', dateChanged);

  getJSON('js/crops.json').then(parseCropData);
}

document.addEventListener('DOMContentLoaded', init);
