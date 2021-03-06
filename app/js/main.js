function init() {
  const SEASONS = ['spring', 'summer', 'fall', 'winter'];
  const SEASON_LENGTH = 28;
  const YEAR_LENGTH = SEASON_LENGTH * 4;
  const FINAL_PHASE_LENGTH = 99999;

  const crops = [];
  const date = {
    day: 1,
    season: 'spring',
    year: 1,
    timestamp: 0,
  };
  const options = {
    farmingLevel: 0,
    profitType: 'average',
    payForSeeds: true,
    vendors: {
      generalStore: true,
      jojaMart: true,
      travelingCart: false,
      oasis: true,
      eggFestival: true,
    },
    fertilizer: 0,
    greenhouse: false,
  };
  const professions = {
    tiller: false,
    agriculturist: false,
  };
  const chart = new Chart('chart', {
    type: 'bar',
    data: {
      datasets: [{
        label: 'Profit per Day',
      }],
    },
    options: {
      legend: {
        display: false,
      },
      scales: {
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Gold',
          },
          ticks: {
            beginAtZero: true,
          },
        }],
        xAxes: [{
          ticks: {
            autoSkip: false,
          },
        }],
      },
    },
  });

  /**
   * Wraps window.fetch() but returns JSON and throws if response was unsuccessful
   * (status outside the range 200-299)
   *
   * @param  {string} url The JSON resource to load
   * @return {Promise<object>}     A promise with the parsed JSON data
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
   */
  function fetchJSON(url) {
    return fetch(url).then((response) => {
      if (!response.ok) {
        const err = new Error(`Failed to load resource '${response.url}'`);
        err.name = response.statusText;
        err.code = response.status;
        throw err;
      }

      return response.json();
    });
  }

  /**
   * Returns the cheapest price for the given seed, dependent upon options.vendors
   * for which vendors are currently enabled
   * Returns Math.Infinity if no seed source available
   *
   * @param  {Object} seed A seed object
   * @return {number}      The cheapest price for the given seed
   */
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
   *
   * @param  {Object} crop      A crop object
   * @param  {number} dayOfYear The day of the year, counted from 0 (e.g. 'Spring 1st' would be 0)
   * @return {boolean}           Whether the crop can grow
   */
  function canGrow(crop, daysToGrow, dayOfYear) {
    return dayOfYear >= crop.seasonStartDate && dayOfYear + daysToGrow < crop.seasonEndDate;
  }

  /**
   * Get the chances of harvesting a crop of each quality
   *
   * @param  {number} farmingLevel Player's farming level, 0-10
   * @param  {number} [fertilizer]   The ID of the fertilizer used
   * @return {number[]}              An array of the chances for each crop, starting
   * with regular, then silver, then gold
   */
  function cropQualityChances(farmingLevel, fertilizer = 0) {
    let fertilizerBonus = 0;

    if (fertilizer === 368) fertilizerBonus = 1;
    else if (fertilizer === 369) fertilizerBonus = 2;

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

  /**
   * Calculates the sell price of a particular quality item
   * @param  {number} basePrice The base price of an object
   * @param  {number} quality   The quality of an object, as an integer of 0-2
   * @return {number}           The calculated sell price of an particular item quality
   */
  function qualitySellPrice(basePrice, quality) {
    // See Object.cs::sellToStorePrice()
    // num = (this.price * (1.0 + (this.quality) * 0.25));
    return Math.floor(basePrice * (1 + (quality * 0.25)));
  }

  /**
   * Gets the yield for a crop, according to options.profitType (e.g. minimum or average)
   * @param  {Object} crop A crop object
   * @return {number}      The yield for that crop
   */
  function getYield(crop) {
    let cropYield = 1;

    /*
     * Functionally this next segment of code is equivalent to cropYield = crop.minHarvest
     *
     * This is very strange, but that is how the logic appears to be in decompiled versions
     * of the game.
     * In decompiled versions of the game, Random.Next(Int32, Int32) is used, which returns an
     * integer LESS than the maximum.
     * And in the game's data files, we can see that minHarvest and maxHarvest are always
     * integers. Therefore minHarvest + 1 will always be <= maxHarvest.
     * So when the decompiled game does Math.min(minHarvest + 1, maxHarvest + 1 + other stuff)
     * The first argument (minHarvest + 1) will always be the returned.
     * And then when the decompiled game runs Random.Next(minHarvest, minHarvest + 1), the
     * result will always be minHarvest.
     */
    if (crop.minHarvest > 1 || crop.maxHarvest > 1) {
      if (options.profitType === 'minimum') {
        cropYield = crop.minHarvest;
      } else if (options.profitType === 'average') {
        const min = crop.minHarvest;
        const max = Math.min(
          crop.minHarvest + 1,
          crop.maxHarvest + 1 + (options.farmingLevel / crop.maxHarvestIncreasePerFarmingLevel),
        ) - 1;

        cropYield = (min + max) / 2;
      } else throw new Error(`options.profitType was '${options.profitType}', not 'minimum' or 'average', which is unexpected`);
    }

    if (crop.chanceForExtraCrops > 0 && options.profitType !== 'minimum') {
      cropYield += Math.min(0.9, crop.chanceForExtraCrops);
    }

    return cropYield;
  }

  /**
   * Main update function. (re-)calculates the crops profitability
   * Called whenever the date or settings is changed
   */
  function update() {
    const cultivatableCrops = [];

    crops.forEach((crop) => {
      // TODO: More elegant way of cloning crop object
      const cleanCrop = JSON.parse(JSON.stringify(crop));

      if (options.fertilizer === 465 || options.fertilizer === 466 ||
        professions.agriculturist === true) {
        /**
         * @see TerrainFeatures/HoeDirt.cs::plant() for this logic
         * @see {@link https://stardewvalleywiki.com/Talk:Speed-Gro#Speed-Gro_Mechanics}
         */

        let daysToGrow = 0;
        for (let i = 0; i < crop.phaseDays.length - 1; i += 1) {
          daysToGrow += crop.phaseDays[i];
        }

        let growthSpeedBonus = 0;
        if (options.fertilizer === 465) growthSpeedBonus = 0.1;
        else if (options.fertilizer === 466) growthSpeedBonus = 0.25;
        if (professions.agriculturist) growthSpeedBonus += 0.1;

        let daysFaster = Math.ceil(daysToGrow * growthSpeedBonus);

        /**
         * This is neccesary because of a weird rounding error in the game
         *
         * It /should/ only apply to crops that normally grow
         * in 10 days (Green Bean, Yam, Grape, Coffee Bean)
         *
         * @see {@link https://stardewvalleywiki.com/Talk:Speed-Gro#Floating_point_imprecision}
         */
        if (daysToGrow === 10 &&
          (growthSpeedBonus === 0.1 || growthSpeedBonus === 0.2)) daysFaster += 1;

        for (let index1 = 0; daysFaster > 0 && index1 < 3; index1 += 1) {
          for (let index2 = 0; index2 < cleanCrop.phaseDays.length; index2 += 1) {
            if (index2 > 0 || cleanCrop.phaseDays[index2] > 1) {
              cleanCrop.phaseDays[index2] -= 1;
              daysFaster -= 1;
            }
            if (daysFaster <= 0) break;
          }
        }
      }

      const dayOfYear = date.timestamp % YEAR_LENGTH;

      const daysToGrow =
        cleanCrop.phaseDays.slice(0, crop.phaseDays.length - 1).reduce((a, b) => a + b, 0);

      if (!canGrow(crop, daysToGrow, dayOfYear) && !options.greenhouse) return;

      // Exclude year 2 crops
      if (crop.seed.vendor.generalStore &&
        date.year < crop.seed.vendor.generalStore.yearAvailable) return;

      // Exclude Strawberries if date before 13th Spring, Year 1
      if (crop.indexOfHarvest === 400 && date.timestamp < 12 && !options.greenhouse) return;

      let seedPrice = cheapestSeedPrice(crop.seed);
      if (options.payForSeeds && seedPrice === Infinity) return;
      else if (!options.payForSeeds) seedPrice = 0;
      // Seed price is effecitvely 0 for crops that regrow in the greenhouse
      else if (options.greenhouse && crop.daysToRegrow) seedPrice = 0;
      // TODO: Add pay for fertilizer option?

      let harvests = 1;
      let growingDays = daysToGrow;
      if (options.greenhouse) {
        // For regrowing crops in the greenhouse, initial days to grow is effectively irrelevant
        growingDays = crop.daysToRegrow ? crop.daysToRegrow : daysToGrow;
      } else if (crop.daysToRegrow) {
        harvests = Math.ceil((crop.seasonEndDate - dayOfYear - daysToGrow) / crop.daysToRegrow);
        growingDays = ((harvests - 1) * crop.daysToRegrow) + daysToGrow;
      } else {
        harvests = Math.floor((crop.seasonEndDate - dayOfYear - 1) / daysToGrow);
        growingDays = harvests * daysToGrow;
      }

      const cropYield = getYield(crop);

      let adjustedSellPrice = crop.price;
      let adjustedQualitySellPrice = crop.price;

      if (options.profitType === 'average') {
        adjustedQualitySellPrice = 0;

        cropQualityChances(options.farmingLevel, options.fertilizer).forEach((chance, quality) => {
          adjustedQualitySellPrice += qualitySellPrice(crop.price, quality) * chance;
        });
      }

      /**
       * Calculate tiller bonus
       * @see Object.cs::sellToStorePrice()
       */
      if (professions.tiller && [-75, -79, -80].indexOf(crop.category) !== -1) {
        if (options.profitType === 'minimum') {
          adjustedQualitySellPrice = Math.floor(adjustedQualitySellPrice * 1.1);
          adjustedSellPrice = Math.floor(adjustedSellPrice * 1.1);
        } else {
          adjustedQualitySellPrice *= 1.1;
          adjustedSellPrice *= 1.1;
        }
      }

      let revenue = 0;

      // Multi-yield crops harvested with scythe can all be quality, see Crop.cs::harvest()
      // ... There are no multi-yield crops harvested with the scythe in practice though
      if (crop.harvestMethod === 1) revenue = adjustedQualitySellPrice * harvests * cropYield;
      else {
        revenue = (adjustedQualitySellPrice * harvests * 1) +
          (adjustedSellPrice * harvests * (cropYield - 1));
      }

      let profit = revenue;
      if (options.payForSeeds) {
        // As Sunflowers drop 0-2 Sunflower Seeds per harvest, an average of 1 can be
        // assumed, reducing the overall seed cost for the season
        // TODO: Check decompiled game for logic that dictates Sunflower seed drops
        if (crop.indexOfHarvest === 421 && options.profitType === 'average') {
          // Sunflower's seed price is effectively 0 in greenhouse
          if (options.greenhouse) seedPrice = 0;

          profit -= seedPrice;
        } else profit -= seedPrice * (crop.daysToRegrow ? 1 : harvests);
      }

      const avgProfit = profit / growingDays;

      if (options.greenhouse) harvests = Infinity;

      cleanCrop.avgProfit = avgProfit;
      cleanCrop.daysToGrow = daysToGrow;
      cleanCrop.harvests = harvests;
      cleanCrop.yield = cropYield;
      cleanCrop.adjustedSellPrice = adjustedQualitySellPrice;
      cleanCrop.seedPrice = seedPrice;
      cleanCrop.profit = profit;

      cultivatableCrops.push(cleanCrop);
    });

    // Sort crops alphabetically
    cultivatableCrops.sort((a, b) => a.name.localeCompare(b.name));

    // Update chart data
    chart.data.labels = cultivatableCrops.map(crop => crop.name);
    chart.data.datasets[0].data = cultivatableCrops.map(crop => crop.avgProfit.toFixed(2));
    chart.data.datasets[0].backgroundColor = cultivatableCrops.map(crop => `rgba(${crop.color[0]}, ${crop.color[1]}, ${crop.color[2]}, 0.5)`);
    chart.update();

    // Empty table>tbody contents
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

    // Re-populate table>tbody
    cultivatableCrops.forEach((crop) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<th scope="row" class="text-nowrap"><span class="icon crop" style="background-position: -${(crop.indexOfHarvest % 24) * 16}px -${Math.floor(crop.indexOfHarvest / 24) * 16}px;"></span>${crop.name}</th>
        <td>${formatPrice(crop.avgProfit)}</td>
        <td>${crop.daysToGrow}</td>
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
   * Parses the given crop data and puts it in the crops array.
   * @param  {Object} cropData The crop data to parse (as loaded from crops.json)
   */
  function parseCropData(cropData) {
    fetchJSON('js/colors.json').then((colors) => {
      Object.values(cropData).forEach((crop) => {
        const cleanCrop = crop;

        cleanCrop.daysToRegrow = (crop.regrowAfterHarvest === -1) ? 0 : crop.regrowAfterHarvest;

        cleanCrop.phaseDays.push(FINAL_PHASE_LENGTH);

        cleanCrop.color = colors[crop.indexOfHarvest];

        cleanCrop.seasonStartDate = seasonToInt(crop.seasonsToGrowIn[0]) * SEASON_LENGTH;
        cleanCrop.seasonEndDate =
          cleanCrop.seasonStartDate + (crop.seasonsToGrowIn.length * SEASON_LENGTH);

        const tc = crop.seed.vendor.travelingCart;
        if (tc) cleanCrop.seed.vendor.travelingCart.avgPrice = (tc.minPrice + tc.maxPrice) / 2;

        crops.push(cleanCrop);
      });

      update();
    });
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

  function profitTypeChanged(evt) {
    const element = evt.target;
    const { value } = element;

    if (['minimum', 'average'].indexOf(value) === -1) return;

    options.profitType = value;

    if (crops.length) update();
  }

  function farmingLevelChanged(evt) {
    const element = evt.target;
    const { value } = element;

    // Disallow any non-integer input (including decimal numbers, negative numbers and E-notation)
    if (!/^\d+$/.test(value)) return;

    // Disallow > 10
    if (Number(value) > 10) return;

    options.farmingLevel = Number(value);

    if (crops.length) update();
  }

  function fertilizerChanged(evt) {
    const element = evt.target;
    const { id } = element;

    if (['noFertilizer', 'basicFertilizer', 'qualityFertilizer', 'speedGro', 'deluxeSpeedGro'].indexOf(id) === -1) return;

    /**
     * For fertilizer IDs/indexes:
     * @see TerrainFeatures/HoeDirt.cs
     * @see Data/ObjectInformation
     */
    if (id === 'noFertilizer') options.fertilizer = 0;
    else if (id === 'basicFertilizer') options.fertilizer = 368;
    else if (id === 'qualityFertilizer') options.fertilizer = 369;
    else if (id === 'speedGro') options.fertilizer = 465;
    else if (id === 'deluxeSpeedGro') options.fertilizer = 466;

    if (crops.length) update();
  }

  function locationChanged(evt) {
    const element = evt.target;
    const { id } = element;

    if (id === 'farm') {
      options.greenhouse = false;
      document.getElementById('season').disabled = false;
    } else if (id === 'greenhouse') {
      options.greenhouse = true;
      document.getElementById('season').disabled = true;
    } else return;

    if (crops.length) update();
  }

  /**
   * Adds event listeners to each element in elementIDs to call function func()
   * Adds a 'change' listener by default, or an 'input' listener for <input type="number"> elements
   *
   * @param  {string[]} elementIDs An array of the element IDs to add listeners to
   * @param  {function} func       The function to call when the event happens
   */
  function bindElements(elementIDs, func) {
    elementIDs.forEach((id) => {
      const element = document.getElementById(id);

      let eventName = 'change';
      if (element.tagName.toLowerCase() === 'input' && element.type === 'number') eventName = 'input';

      element.addEventListener(eventName, func);
    });
  }

  /**
   * Add all listeners
   */
  function bindUI() {
    // Date
    bindElements(['day', 'season', 'year'], dateChanged);

    // Expenses
    bindElements(['payForSeeds'], payForSeedsChanged);

    // Professions
    bindElements(['tiller', 'agriculturist'], professionChanged);

    // Seed sourcea
    bindElements(['generalStore', 'jojaMart', 'oasis', 'travelingCart'], seedSourcesChanged);

    // Profit type
    bindElements(['profitType'], profitTypeChanged);

    // Locations
    bindElements(['farm', 'greenhouse'], locationChanged);

    // Farming level
    bindElements(['farmingLevel'], farmingLevelChanged);

    // Fertilizer
    bindElements(['noFertilizer', 'basicFertilizer', 'qualityFertilizer', 'speedGro', 'deluxeSpeedGro'], fertilizerChanged);
  }
  bindUI();

  fetchJSON('js/crops.json').then(parseCropData);
}

document.addEventListener('DOMContentLoaded', init);
