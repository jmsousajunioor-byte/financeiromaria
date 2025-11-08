module.exports = {
  extends: [
    "stylelint-config-standard",
    "stylelint-config-tailwindcss"
  ],
  rules: {
    // Allow Tailwind at-rules and PostCSS/Tailwind constructs
    "at-rule-no-unknown": [true, {
      "ignoreAtRules": ["tailwind", "apply", "variants", "responsive", "screen", "layer"]
    }]
    ,
    // Allow vendor-prefixed backdrop-filter for Safari compatibility
    "property-no-vendor-prefix": [true, { "ignoreProperties": ["backdrop-filter"] }]
  }
};
