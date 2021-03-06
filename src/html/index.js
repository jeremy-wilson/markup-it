const blocks = require('./blocks');
const inlines = require('./inlines');
const deserializeHtml = require('./deserializeHtml');
const serializeDefault = require('./serializeDefault');

const ALL = [
    deserializeHtml, // There's only one general rule for deserialization
    ...blocks,
    ...inlines,
    serializeDefault // Default catch-all rule
];

// We don't use groups of rules such as 'block' and 'inline' for
// deserialization, because we have a single deserialization rule.
//
// For serialization, there is no has no ambiguity in the Slate
// format, so we always use all the rules at the same time.
module.exports = { block: ALL };
