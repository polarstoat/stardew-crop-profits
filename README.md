# Stardew Crop Profits

## Development

### Requirements

* [Node.js](https://nodejs.org/) >=10.1.0
* [npm](https://www.npmjs.com/get-npm) >=6.0.1
* [gulp-cli](https://www.npmjs.com/package/gulp-cli) >=2.0.1

> This project has only been tested with the above requirements, but there is a good chance that it will work with earlier versions

### Setup

1. Clone this repository

   ```bash
   git clone https://github.com/polarstoat/stardew-crop-profits.git
   ```

2. Change into the new directory

   ```bash
   cd stardew-crop-profits/
   ```

3. Install dependencies

   ```bash
   npm install
   ```

### Usage

1. Run the default gulp task for development (this is an alias for `gulp serve`)

   ```bash
   gulp
   ```

2. Run the `deploy` gulp task to publish changes to the `gh-pages` branch

   ```bash
   gulp deploy
   ```

### Project structure

```
.
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
├── README.md
├── gulpfile.js
├── package-lock.json
├── package.json
└── stardew-crop-profits.sublime-project
```

Path | Explanation
--- | ---
`app/` | This is where the source code lives. The contents of this folder are either compiled and minified by gulp and then copied to `dist/`
`app/scss/` | The [Sass](https://sass-lang.com) in here is compiled to CSS and copied to `dist/css/`
`dist/` | This is for compiled, minified, distribution code. The contents of folder are pushed to branch `gh-pages`. This folder is ignored by `.gitignore`
`.eslintrc.js` | Config file for [ESLint](https://eslint.org) JS linter
`.gitignore` | [Ignore file](https://git-scm.com/docs/gitignore) for git
`README.md` | Information about the project and how to use it (that's this file)
`gulpfile.js` | This project uses the task runner [gulp](https://gulpjs.com), the build configuration and tooling for that lives in here
`package-lock.json` | Created by npm to manage dependency versions. Can be ignored for all purposes
`package.json` | Where the npm dependencies are listed
`stardew-crop-profits.sublime-project` | A [Sublime Text project](https://www.sublimetext.com/docs/3/projects.html) file

