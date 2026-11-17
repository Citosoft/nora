const base = require('../../tailwind.config.cjs');
module.exports = { ...base, content: [...base.content, './tests/ui/**/*.{ts,tsx}', './tests/simulator/**/*.{ts,tsx}'] };
