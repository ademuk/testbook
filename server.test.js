const PropTypes = require("prop-types");
const {inferPropTypes} = require("./server");

describe('server', () => {

  class Message {}

  [
    [PropTypes.array, 'array'],
    [PropTypes.bool, 'boolean'],
    [PropTypes.func, 'function'],
    [PropTypes.number, 'number'],
    [PropTypes.object, 'object'],
    [PropTypes.string, 'string'],
    [PropTypes.symbol, 'symbol'],
    [PropTypes.node, 'ReactNode'],

    // A React element.
    [PropTypes.element, 'ReactElement'],

    // A React element type (ie. MyComponent).
    [PropTypes.elementType, 'ReactElement type'],
    [PropTypes.instanceOf(Message), 'instanceOf:Message'],
    [PropTypes.oneOf( ['News', 'Photos']), 'oneOf:["News","Photos"]'],

    // An object that could be one of many types
    [PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Message)
    ]), undefined],

    // An array of a certain type
    [PropTypes.arrayOf(PropTypes.number), 'array'],

    // An object with property values of a certain type
    [PropTypes.objectOf(PropTypes.number), 'object'],

    // An object taking on a particular shape
    [PropTypes.shape({
      color: PropTypes.string,
      fontSize: PropTypes.number
    }), 'object'],

    // An object with warnings on extra properties
    [PropTypes.exact({
      name: PropTypes.string,
      quantity: PropTypes.number
    }), 'object'],
  ].forEach(([propType, expected]) => {
    test(`inferPropTypes ${expected}`, () => {
      expect(
        inferPropTypes({
          prop: propType
        })
      ).toEqual({
        prop: [expected, false]
      });
    });

    test(`inferPropTypes ${expected} required`, () => {
      expect(
        inferPropTypes({
          prop: propType.isRequired
        })
      ).toEqual({
        prop: [expected, true]
      });
    });
  });
});
