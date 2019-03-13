# [Stardew Crop Profits](https://polarstoat.github.io/stardew-crop-profits/)

A tool to calculate and visualise the profitability of crops in Stardew Valley

**[Open application →](https://polarstoat.github.io/stardew-crop-profits/)**

#### What's accounted for

* The current in-game date
* The ratio of gold:silver:regular quality crops, as determined by farming level and fertilizer used
* The 'Tiller' and 'Agriculturist' professions
* The growth speed of a crop, as determined by fertilizer and 'Agriculturist' profession
* Which shops the player chooses to buy from, and the cost of seeds only from the players chosen shops
* The minimum yield for each crop, and the chance for extra crops when harvesting
* Whether the player buys seeds, or uses the Seed Maker
* Whether seeds are planted on the farm or in the greenhouse

#### What's NOT accounted for

* The cost of fertilizer, including how long it remains for
* Selling harvested produce as [Artisan Goods](https://stardewvalleywiki.com/Artisan_Goods), by using Kegs, Preserves Jars and Casks
* Daily luck levels
* Giant crops

### The calculations

Different calculations are used depending on which 'Show profit as' option is chosen: minimum profit, or average profit.

#### Minimum profit

This is the absolute minimum profit possible to be made, assuming that no quality crops are harvested, and only the minimum yield for each crop is harvested (no extra crops):

<pre>( Harvests ✖️ Yield ✖️ Sell price ) ➖ Seed price</pre>

This calculation is identical to that on the [Stardew Valley Wiki](https://stardewvalleywiki.com/Crops#Gold_per_Day).

#### Average profit

<pre>( Harvests ✖️ ( Yield ➕ Chance for extra crops ) ✖️ ( ( Normal quality sell price ✖️ Chance for normal quality ) ➕ ( Silver quality sell price ✖️ Chance for silver quality ) ➕ ( Gold quality sell price ✖️ Chance for gold quality ) ) ) ➖ Seed price</pre>

## Development

### Requirements

* [Node.js](https://nodejs.org/) >= 11.9.0
* [npm](https://www.npmjs.com/get-npm) >= 6.9.0
* [gulp-cli](https://www.npmjs.com/package/gulp-cli) >= 2.0.1

> This project has only been tested with the above requirements, but there is a good chance that it will work with earlier versions

### Setup

1. Clone this repository

   ```bash
   git clone https://github.com/polarstoat/stardew-crop-profits.git
   ```

2. Change into the new folder

   ```bash
   cd stardew-crop-profits/
   ```

3. Install dependencies

   ```bash
   npm install
   ```

### Usage

1. Run the default gulp task (an alias for the `serve` task) for development to watch files in the `app/` folder and live reload/inject changes with [Browsersync](https://browsersync.io)

   ```bash
   gulp
   ```

2. Run the `serve:dist` task to preview a full build before deploying

   ```bash
   gulp serve:dist
   ```

3. Run the `deploy` task to publish to [GitHub Pages](https://pages.github.com)

   ```bash
   gulp deploy
   ```

### Project structure

```
.
├── .tmp/
│   ├── css/
│   └── js/
├── app/
│   ├── img/
│   ├── js/
│   ├── scss/
│   └── index.html
├── dist/
│   ├── css/
│   ├── img/
│   ├── js/
│   └── index.html
├── .eslintrc.js
├── .gitignore
├── LICENSE.md
├── README.md
├── gulpfile.js
├── package-lock.json
├── package.json
└── stardew-crop-profits.sublime-project
```

File | Purpose
--- | ---
`.tmp/` | A temporary folder automatically created during development with the `serve` gulp task. Contains compiled Sass and JavaScript
`app/` | Source code of the application. The contents of this folder are compiled and minified by gulp, and then copied to `dist/`
`dist/` | Compiled and minified, distribution code. The contents of this folder are pushed to GitHub Pages. As this contains entirely 'built' code, this folder is ignored by Git
`.eslintrc.js` | Configuration for the [ESLint](https://eslint.org) JS linter
`.gitignore` | Specifies what files Git should ignore ([documentation](https://git-scm.com/docs/gitignore))
`LICENSE.md` | License information about the project
`README.md` | Information about the project
`gulpfile.js` | Tasks to be run by [gulp](https://gulpjs.com) for automating Sass compilation, JS minification, GitHub Pages deployment, etc.
`package-lock.json` | Automatically generated by npm to manage the `node_modules/` tree ([documentation](https://docs.npmjs.com/files/package-lock.json))
`package.json` | Manages project dependencies ([documentation](https://docs.npmjs.com/files/package.json))
`stardew-crop-profits.sublime-project` | Project file for Sublime Text ([documentation](https://www.sublimetext.com/docs/3/projects.html))

### Contributing

Contributions to the project are very much welcome. Please [open issues](https://github.com/polarstoat/stardew-crop-profits/issues) to discuss features and report bugs. If you would like to submit a pull request, please do so, but adhere to the conventions of the project.
