import R from 'ramda';


/**
 * Asserts that the "expected" XML fragment is contained in the received XML
 * response from supertest.
 *
 * @param  {string} expected - XML fragment expected in the response.
 * @param  {object} response - Response from supertest.
 */
export const assertXmlContains = R.curry((expected, response) => {
  // Normalize both XML chunks by removing whitespace.
  expect(response.replace(/[\s]/g, '')).toMatch(expected.replace(/[\s]/g, ''));
});
