/** @type {import('lint-staged').Configuration} */
module.exports = {
  '**/*.{ts,tsx,js,jsx,cjs,mjs,json,md,css}': 'prettier --write',
  '**/*.{ts,tsx,js,jsx}': 'eslint --fix',
  // tsc cannot accept a list of files together with a project (it would ignore
  // tsconfig strict flags), so run it as a whole-project check via a function
  // task. lint-staged executes the returned string verbatim with no file args.
  '**/*.{ts,tsx}': () => 'tsc --noEmit',
};
