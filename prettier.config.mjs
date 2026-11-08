/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
  singleQuote: true,
  printWidth: 100,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/app/globals.css',
  tailwindFunctions: ['cn', 'clsx'],
  // Keep CSS strings in double quotes, matching SPEC §6.3.
  overrides: [{ files: '*.css', options: { singleQuote: false } }],
};

export default config;
