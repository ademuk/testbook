import {chunk} from "./promise";

describe('chunk', () => {
  test('chunk', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7, 8], 3)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8]
    ])
  });
});
