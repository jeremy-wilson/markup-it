const is = require('is');
const Immutable = require('immutable');

const Token = require('../models/token');

/**
 * Match a text using a rule
 * @param {ParsingState} state
 * @param {Rule} rule
 * @param {String} text
 * @return {List<Token>|null}
 */
function matchRule(state, rule, text) {
    let matches  = rule.onText(state, text);
    let ruleType = rule.getType();

    if (!matches) {
        return;
    }
    if (!is.array(matches) && !Immutable.List.isList(matches)) {
        matches = [matches];
    }

    return Immutable.List(matches)
        .map(function(match) {
            return Token.create(match.type || ruleType, match);
        });
}

module.exports = matchRule;
