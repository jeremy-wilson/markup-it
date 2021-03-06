const { Record, List, Map, Set } = require('immutable');
const { Document, Text, Block } = require('slate');
const BLOCKS = require('../constants/blocks');
const RuleFunction = require('./rule-function');

/*
    State stores the global state when serializing a document or deseriaizing a text.
 */

const DEFAULTS = {
    text:     '',
    nodes:    List(),
    marks:    Set(),
    kind:     String('block'),
    rulesSet: Map(),
    depth:    0,
    props:    Map()
};

class State extends Record(DEFAULTS) {

    /**
     * Create a new state from a set of rules.
     * @param  {Array} rules
     * @return {State} state
     */
    static create(rulesSet = {}) {
        return new State({
            rulesSet: Map(rulesSet).map(List)
        });
    }

    /**
     * Return list of rules currently being used
     * @return {List} rules
     */
    get rules() {
        const { kind, rulesSet } = this;
        return rulesSet.get(kind, List());
    }

    /**
     * Change set of rules to use.
     *
     * @param  {String} kind
     * @return {State} state
     */
    use(kind) {
        return this.merge({ kind });
    }

    /**
     * Set a prop for the state.
     *
     * @param  {String} key
     * @param  {Mixed} value
     * @return {State} state
     */
    setProp(key, value) {
        let { props } = this;
        props = props.set(key, value);

        return this.merge({ props });
    }

    /**
     * Get a prop from the state
     *
     * @param  {String} key
     * @return {Mixed}
     */
    getProp(key) {
        const { props } = this;
        return props.get(key);
    }

    /**
     * Write a string. This method can be used when serializing nodes into text.
     *
     * @param  {String} string
     * @return {State} state
     */
    write(string) {
        let { text } = this;
        text += string;
        return this.merge({ text });
    }

    /**
     * Replace all the text in the state.
     *
     * @param  {String} text
     * @return {State} state
     */
    replaceText(text) {
        return this.merge({ text });
    }

    /**
     * Peek the first node in the stack
     *
     * @return {Node} node
     */
    peek() {
        return this.nodes.first();
    }

    /**
     * Shift the first node from the stack
     *
     * @return {State} state
     */
    shift() {
        let { nodes } = this;
        nodes = nodes.shift();
        return this.merge({ nodes });
    }

    /**
     * Unshift a node in the list
     *
     * @param  {Node} node
     * @return {State} state
     */
    unshift(node) {
        let { nodes } = this;
        nodes = nodes.unshift(node);
        return this.merge({ nodes });
    }

    /**
     * Push a new node to the stack. This method can be used when deserializing
     * a text into a set of nodes.
     *
     * @param  {Node | List<Node>} node
     * @return {State} state
     */
    push(node) {
        let { nodes } = this;

        if (List.isList(node)) {
            nodes = nodes.concat(node);
        } else {
            nodes = nodes.push(node);
        }

        return this.merge({ nodes });
    }

    /**
     * Push a new mark to the active list
     *
     * @param  {Mark} mark
     * @return {State} state
     */
    pushMark(mark) {
        let { marks } = this;
        marks = marks.add(mark);
        return this.merge({ marks });
    }

    /**
     * Push a new text node.
     *
     * @param  {String} text
     * @return {State} state
     */
    pushText(text) {
        const { marks } = this;

        let node = Text.createFromString(text, marks);

        if (this.kind == 'block') {
            node = Block.create({
                type: BLOCKS.TEXT,
                nodes: [node]
            });
        }

        return this.push(node);
    }

    /**
     * Move this state to a upper level
     *
     * @param  {Number} string
     * @return {State} state
     */
    up() {
        let { depth } = this;
        depth--;
        return this.merge({ depth });
    }

    /**
     * Move this state to a lower level
     *
     * @param  {Number} string
     * @return {State} state
     */
    down() {
        let { depth } = this;
        depth++;
        return this.merge({ depth });
    }

    /**
     * Skip "n" characters in the text.
     * @param  {Number} n
     * @return {State} state
     */
    skip(n) {
        let { text } = this;
        text = text.slice(n);
        return this.merge({ text });
    }

    /**
     * Parse current text buffer
     * @return {State} state
     */
    lex(rest = '', opts = {}) {
        const state = this;
        const { text } = state;

        let startState = state;
        const trimedRest = opts.trim !== false ? rest.trim() : rest;
        if (trimedRest) {
            startState = startState.pushText(trimedRest);
        }

        // No text to parse, we return
        if (!text) {
            return startState;
        }

        // We apply the rules to find the first matching one
        const newState = startState.applyRules('deserialize');

        // Same state cause an infinite loop
        if (newState == startState) {
            throw new Error('A rule returns an identical state, returns undefined instead when passing.');
        }

        // No rules match, we move and try the next char
        if (!newState) {
            return state
                .skip(1)
                .lex(rest + text[0], opts);
        }

        // Otherwise we keep parsing
        return newState.lex(rest, opts);
    }

    /**
     * Apply first matching rule
     * @param  {String} text
     * @return {State} state
     */
    applyRules(kind) {
        const state = this;
        const { rules } = state;
        let newState;

        rules
        .filter(rule => rule[kind])
        .forEach(rule => {
            newState = RuleFunction.exec(rule[kind], state);
            if (newState) {
                return false;
            }
        });

        return newState;
    }

    /**
     * Deserialize a text into a Node.
     * @param  {String} text
     * @return {List<Node>} nodes
     */
    deserialize(text) {
        const state = this
            .down()
            .merge({ text, nodes: List() })
            .lex();

        return state.nodes;
    }

    /**
     * Deserialize a string content into a Document.
     * @param  {String} text
     * @return {Document} document
     */
    deserializeToDocument(text) {
        const nodes = this.deserialize(text);
        return Document.create({ nodes });
    }

    /**
     * Serialize nodes into text
     * @param  {List<Node>} nodes
     * @return {String} text
     */
    serialize(nodes) {
        const state = this
            .down()
            .merge({ text: '', nodes: List(nodes) })
            ._serialize();
        return state.text;
    }

    /**
     * Serialize a document into text
     * @param  {Document} document
     * @return {String} text
     */
    serializeDocument(document) {
        const { nodes } = document;
        return this.serialize(nodes);
    }

    /**
     * Serialize a node into text
     * @param  {Node} node
     * @return {String} text
     */
    serializeNode(node) {
        return this.serialize([ node ]);
    }

    /**
     * Update the state to serialize it.
     * @return {State} state
     */
    _serialize() {
        let state = this;

        if (state.nodes.size == 0) {
            return state;
        }

        state = state.applyRules('serialize');

        // No rule can match this node
        if (!state) {
            throw new Error(`No rule match node ${this.peek().kind}#${this.peek().type || ''}`);
        }

        // Same state cause an infinite loop
        if (state == this) {
            throw new Error('A rule returns an identical state, returns undefined instead when passing.');
        }

        return state._serialize();
    }
}

module.exports = State;
