const { Block, Inline, Text, Mark, Range } = require('slate');

const State = require('./models/state');
const Deserializer = require('./models/deserializer');
const Serializer = require('./models/serializer');

const MARKS = require('./constants/marks');
const BLOCKS = require('./constants/blocks');
const INLINES = require('./constants/inlines');
const TABLE_ALIGN = require('./constants/table-align');

module.exports = {
    State,
    Serializer,
    Deserializer,
    // Constants
    MARKS,
    BLOCKS,
    INLINES,
    TABLE_ALIGN,
    // Slate exports
    Block, Inline, Text, Mark, Range
};
