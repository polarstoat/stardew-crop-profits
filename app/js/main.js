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
  const YEAR_LENGTH = SEASON_LENGTH * 4;

  const crops = [];
  const date = {
    day: 1,
    season: 'spring',
    year: 1,
    timestamp: 0,
  };
  const options = {
    includeChanceForExtraCrops: false,
    payForSeeds: true,
    vendors: {
      generalStore: true,
      jojaMart: true,
      travelingCart: false,
      oasis: true,
      eggFestival: true,
    },
  };
  const professions = {
    tiller: false,
    agriculturist: false,
  };

  function cheapestSeedPrice(seed) {
    let cheapest = Infinity;

    Object.keys(seed.vendor).forEach((vendor, i, vendors) => {
      if (!options.vendors[vendor]) return;

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

  /**
   * Takes a price and formats the number in a friendly way, adding a gold icon beforehand
   * and a 'g' afterwards
   *
   * @param  {number}  price    The price to format
   * @param  {Boolean} [goldIcon] Whether to display a gold icon before the price
   * @return {string}           The formatted price
   *
   * @see {@link https://stardewvalleywiki.com/Template:Price} for the inspiration for this
   */
  function formatPrice(price, goldIcon = true) {
    const formattedPrice = /\.[\d]{3,}/.test(price.toString()) ? price.toFixed(2) : price;

    if (goldIcon) {
      return `<span class="text-nowrap"><span class="icon gold"></span>${formattedPrice}g</span>`;
    }
    return `${formattedPrice}g`;
  }

  /**
   * Checks whether a crop has enough time to grow
   * @param  {Object} crop      A crop object
   * @param  {number} dayOfYear The day of the year, counted from 0 (e.g. 'Spring 1st' would be 0)
   * @return {boolean}           Whether the crop can grow
   */
  function canGrow(crop, dayOfYear) {
    return dayOfYear >= crop.seasonStartDate && dayOfYear + crop.daysToGrow < crop.seasonEndDate;
  }

  /**
   * Get the chances of harvesting a crop of each quality
   * @param  {number} farmingLevel Player's farming level, 0-10
   * @param  {number} [fertilizer]   The ID of the fertilizer used
   * @return {number[]}              An array of the chances for each crop, starting
   * with regular, then silver, then gold
   */
  function cropQualityChances(farmingLevel, fertilizer = undefined) {
    let fertilizerBonus = 0;

    if (fertilizer) {
      if (fertilizer === 368) fertilizerBonus = 1;
      else if (fertilizer === 369) fertilizerBonus = 2;
      else throw new Error(`Invalid fertilizer passed: '${fertilizer}'`);
    }

    // Calculation for goldChance same as Crop.cs::harvest() but with brackets added for readability
    const goldChance = (0.2 * (farmingLevel / 10.0))
      + (0.2 * fertilizerBonus * ((farmingLevel + 2.0) / 12.0))
      + 0.01;

    // Calculation for silverChance same as Crop.cs::harvest()
    let silverChance = Math.min(0.75, goldChance * 2.0);
    // But because it is in an `else if` after the goldChance calculation, we have to
    // multiply it by the chance of it being NOT gold (i.e. 1 - goldChance)
    silverChance *= 1 - goldChance;

    const regularChance = 1 - goldChance - silverChance;

    return [regularChance, silverChance, goldChance];
  }

  function update() {
    const cultivatableCrops = [];

    crops.forEach((crop) => {
      const cleanCrop = crop;

      const dayOfYear = date.timestamp % YEAR_LENGTH;

      if (!canGrow(crop, dayOfYear)) return;

      // Exclude year 2 crops
      if (crop.seed.vendor.generalStore &&
        date.year < crop.seed.vendor.generalStore.yearAvailable) return;

      let seedPrice = cheapestSeedPrice(crop.seed);
      if (options.payForSeeds && seedPrice === Infinity) return;
      else if (!options.payForSeeds) seedPrice = 0;

      // TODO: Add 'Agriculturist' profession multiplier to crop.daysToGrow
      const harvests = (crop.daysToRegrow)
        ? Math.ceil((crop.seasonEndDate - dayOfYear - crop.daysToGrow) / crop.daysToRegrow)
        : 1;

      let cropYield = crop.harvest.minHarvest || 1;
      if (options.includeChanceForExtraCrops) cropYield += (crop.harvest.chanceForExtraCrops || 0);

      let adjustedSellPrice = crop.sellPrice;

      // Calculate tiller bonus, see Object.cs::sellToStorePrice()
      if (professions.tiller && ['Basic -75', 'Basic -79', 'Basic -80'].indexOf(crop.category) !== -1) adjustedSellPrice = Math.floor(adjustedSellPrice * 1.1);

      const revenue = adjustedSellPrice * harvests * cropYield;

      let profit = revenue;
      if (options.payForSeeds) profit -= seedPrice;

      const totalGrowingDays = (((harvests - 1) * crop.daysToRegrow) + crop.daysToGrow);
      const avgProfit = profit / totalGrowingDays;

      cleanCrop.avgProfit = avgProfit;
      cleanCrop.totalGrowingDays = totalGrowingDays;
      cleanCrop.harvests = harvests;
      cleanCrop.yield = cropYield;
      cleanCrop.adjustedSellPrice = adjustedSellPrice;
      cleanCrop.seedPrice = seedPrice;
      cleanCrop.profit = profit;

      cultivatableCrops.push(cleanCrop);
    });

    // Sort crops alphabetically
    cultivatableCrops.sort((a, b) => a.name.localeCompare(b.name));

    // Update DOM
    const tbody = document.getElementById('results').children[1];
    tbody.innerHTML = '';

    // If there aren't any cultivateable crops
    if (!cultivatableCrops.length) {
      const tr = document.createElement('tr');
      tr.classList.add('table-warning');
      tr.innerHTML = '<td colspan="8">No crops can grow!</td>';

      tbody.appendChild(tr);

      // This effectively exits the update() function, preventing the forEach loop below
      return;
    }

    cultivatableCrops.forEach((crop) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<th scope="row" class="text-nowrap"><span class="icon crop" style="background-position: -${(crop.id % 24) * 16}px -${Math.floor(crop.id / 24) * 16}px;"></span>${crop.name}</th>
        <td>${formatPrice(crop.avgProfit)}</td>
        <td>${crop.totalGrowingDays}</td>
        <td>${crop.harvests}</td>
        <td>${crop.yield}</td>
        <td>${formatPrice(crop.adjustedSellPrice)}</td>
        <td>${formatPrice(crop.seedPrice)}</td>
        <td>${formatPrice(crop.profit)}</td>`;
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

  /**
   * Test if a crop is a wild seed crop, e.g. 'Wild Horseradish', 'Spice Berry', etc.
   * This code is pretty much identical to what's used in the game's Crop.cs file
   * @param  {object}  crop A crop object
   * @return {Boolean}      Whether the crop is a wild seed crop
   */
  function isWildSeedCrop(crop) {
    return crop.rowInSpriteSheet === 23;
  }

  function parseCropData(cropData) {
    Object.values(cropData).forEach((crop) => {
      const cleanCrop = crop;

      if (isWildSeedCrop(crop)) return;

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
    const { id, value } = element;

    if (id === 'day' || id === 'year') {
      // Disallow any non-integer input (including decimal numbers, negative numbers and E-notation)
      if (!/^\d+$/.test(value)) return;

      // Disallow 0
      if (value < 1) return;

      // Disallow > SEASON_LENGTH for the day input
      if (id === 'day' && value > SEASON_LENGTH) return;

      date[id] = Number(value);
    } else if (id === 'season') {
      // Disallow any string not in SEASONS array
      if (SEASONS.indexOf(value) === -1) return;

      date.season = value;
    } else {
      throw new Error('Function dateChanged() was called in an invalid way; its only meant to be used as an event handler for the date inputs');
    }

    date.timestamp =
      ((date.year - 1) * YEAR_LENGTH)
      + (seasonToInt(date.season) * SEASON_LENGTH)
      + (date.day - 1);

    /**
     * If the crop data has been loaded and parsed, then update the display.
     * If it hasn't, once it has loaded an itial update wil be called anyway.
     */
    if (crops.length) update();
  }

  function payForSeedsChanged(evt) {
    options.payForSeeds = evt.target.checked;

    if (!options.payForSeeds) {
      document.getElementById('generalStore').disabled = true;
      document.getElementById('jojaMart').disabled = true;
      document.getElementById('oasis').disabled = true;
      document.getElementById('travelingCart').disabled = true;
    } else {
      document.getElementById('generalStore').disabled = false;
      document.getElementById('jojaMart').disabled = false;
      document.getElementById('oasis').disabled = false;
      document.getElementById('travelingCart').disabled = false;
    }

    if (crops.length) update();
  }

  function professionChanged(evt) {
    const element = evt.target;
    const { id } = element;

    // This surreal way of using .hasOwnProperty() is because of https://eslint.org/docs/rules/no-prototype-builtins
    if (!Object.prototype.hasOwnProperty.call(professions, id)) return;

    professions[id] = element.checked;

    if (crops.length) update();
  }

  function seedSourcesChanged(evt) {
    const element = evt.target;
    const { id } = element;

    // This surreal way of using .hasOwnProperty() is because of https://eslint.org/docs/rules/no-prototype-builtins
    if (!Object.prototype.hasOwnProperty.call(options.vendors, id)) return;

    options.vendors[id] = element.checked;

    if (crops.length) update();
  }

  /**
   * Add event listeners to inputs
   */
  function bindUI() {
    // Date
    document.getElementById('day').addEventListener('input', dateChanged);
    document.getElementById('season').addEventListener('change', dateChanged);
    document.getElementById('year').addEventListener('input', dateChanged);

    document.getElementById('payForSeeds').addEventListener('change', payForSeedsChanged);

    document.getElementById('tiller').addEventListener('change', professionChanged);
    document.getElementById('agriculturist').addEventListener('change', professionChanged);

    document.getElementById('generalStore').addEventListener('change', seedSourcesChanged);
    document.getElementById('jojaMart').addEventListener('change', seedSourcesChanged);
    document.getElementById('oasis').addEventListener('change', seedSourcesChanged);
    document.getElementById('travelingCart').addEventListener('change', seedSourcesChanged);
  }
  bindUI();

  getJSON('js/crops.json').then(parseCropData);
}

document.addEventListener('DOMContentLoaded', init);
